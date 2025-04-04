import db from '../database/db.js';

export async function dumpCards() {
  /*
   * c = 'card' table (contains card data)
   * pn = 'pokeNumCard' junction table (links cards to pokedex numbers)
   * s = 'set' table (contains set data)
   * cs = 'cardSets' junction table (connects cards to sets)
   * cv = 'cardVariant' table (contains details related to variants like 'reverse holographic')
   * cval = 'cardValue' table (contains card value info)
   * */
  const dumpQuery = `
   SELECT 
     c.cardID as           card_id, 
     c.cardName as         card_name,
     c.artHighRes as       art,
     pn.pokedexNumber as   pokedex_number,
     s.setName as          set_name,
     s.seriesName as       series_name,
     s.logoURL as          set_logo,
     cv.variantName as     variant,
     cval.currentValue as  card_value
   FROM card c 
     INNER JOIN pokeNumCard pn ON  c.cardID = pn.cardID
     INNER JOIN cardSets cs ON     c.cardID = cs.cardID
     INNER JOIN sets s ON          cs.setID = s.setID
     INNER JOIN cardVariant cv ON  c.cardID = cv.cardID
     INNER JOIN cardValue cval ON  cv.variantID = cval.variantID
   ORDER BY                      cval.currentValue DESC`;
  // End SQL garbage
  const [res] = await db.execute(dumpQuery);
  return res;
}

// Takes a reponse in the form of a JSON object containing multiple carads at the top level
// Calls propagateCard for each of them.
export async function propagateSet(setData) {
  for (const card in setData) {
    await propagateCard(setData[card]);
  }
}

// Bring card into noramlised database; only take elements needed for usage within our context.
export async function propagateCard(cardData) {

  // Add card to card table (Non variant specific information, constant values associated with card)
  const nameSQL = 'INSERT IGNORE INTO `card` (`cardID`, `cardName`, `artLowRes`, `artHighRes`) VALUES(?, ?, ?, ?)';
  const nameValues = [cardData.id, cardData.name, cardData.images.small, cardData.images.small];
  await db.execute(nameSQL, nameValues);
  console.log(`ADDED ${cardData.name}, ${cardData.id} to card table`)

  // Add pokenum for each pokemon present (Add number to pokedex numbers and link it to the card)
  if (Object.hasOwn(cardData, 'nationalPokedexNumbers')) {
    for (const pkNum of cardData.nationalPokedexNumbers) {
      const pokeNumSQL = 'INSERT IGNORE INTO `pokeNum` (`pokedexNumber`) VALUES (?)'
      const pokeNumValues = [pkNum];
      await db.execute(pokeNumSQL, pokeNumValues);
      console.log(`ADDED ${pkNum} to pokedexNum table`)
      const pokeNumCardSQL = 'INSERT IGNORE INTO `pokeNumCard` (`cardID`, `pokedexNumber`) VALUES (?, ?)';
      const pokeNumCardValues = [cardData.id, pkNum];
      await db.execute(pokeNumCardSQL, pokeNumCardValues);
      console.log(`ADDED ${cardData.id}, ${pkNum} to pokeNumCard table`)
    }
  }

  // Card variants, need to check for tcgplayer section to do this, some reponses with no market data do not include
  // this section therefore must check for it. Need to make a decision on whether these are useful to us; if so, we need
  // to use a more complicated join for binder propagation and maybe set a default value of 0 and not NULL for price here? 
  if (Object.hasOwn(cardData, 'tcgplayer')) {
    for (const cardVariant in cardData.tcgplayer.prices) {
      const variantID = cardData.id + '-' + cardVariant.slice(0, 6);
      const cardVariantSQL = 'INSERT IGNORE INTO `cardVariant` (`variantID`, `cardID`,`variantName`) VALUES (?, ?, ?)';
      const cardVariantValues = [variantID, cardData.id, cardVariant];
      await db.execute(cardVariantSQL, cardVariantValues)
      console.log(`ADDED ${cardData.variantID} TO cardVariant table`);

      // We will never overwrite or remove old data here, so we don't INSERT IGNORE, just INSERT. 
      // SQL table for value includes a default UUID as primary key; maybe not best practice? 
      const valueSQL = 'INSERT INTO `cardValue` (`currentValue`,`lastUpdated`,`lastQueried`,`variantID`) VALUES (?, ?, ?, ?)';
      const currentValue = cardData.tcgplayer.prices[cardVariant].market;
      const lastUpdated = cardData.tcgplayer.updatedAt.replace(/\//g, '-');
      const lastQueried = new Date().toISOString();
      const valueValues = [currentValue, lastUpdated, lastQueried, variantID];
      await db.execute(valueSQL, valueValues);
      console.log(`ADDED ${cardData.name}: $${currentValue} TO cardVariant table`);
    }
  };

  // Set setup, uses a junction table to connect cards with sets in a N-N relationship; it's not actually necessary to do this as 
  // far as I can see, in the event there would be a duplicate entry the primary key would collide anyway; but if we ever handle that,
  // then this would be useful has we could handle multiple CARD id's pointing to different sets. (doesn't happen, not critical)

  // This section adds the set information which is contained within the card; can get seperately from card also using %apiurl%/sets/
  const setSQL = 'INSERT IGNORE INTO `sets` (`setID`, `setName`, `setReleaseDate`, `symbolURL`, `logoURL`, `seriesName`) VALUES (?, ?, ?, ?, ?, ?)'
  const releaseDate = cardData.set.releaseDate.replace(/\//g, '-');
  const setValues = [cardData.set.id, cardData.set.name, releaseDate, cardData.set.images.symbol, cardData.set.images.logo, cardData.set.series];
  await db.execute(setSQL, setValues);

  // This is the junction table handling sets as if it was a N-N relationship (it's not, as far as I can see)
  const cardSetsSQL = 'INSERT IGNORE INTO cardSets (`cardID`, `setID`, `setNumber`) VALUES (?, ?, ?)';
  const cardSetsValues = [cardData.id, cardData.set.id, cardData.number];
  await db.execute(cardSetsSQL, cardSetsValues);
  console.log(`ADDED ${cardData.set.name} TO sets table`, '\n');

}
