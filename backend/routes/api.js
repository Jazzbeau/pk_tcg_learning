import { Router } from 'express';
import db from '../database/db.js';
import { getCard } from '../models/pokeTCGAPI.js';
import { getSet } from '../models/pokeTCGAPI.js';
import { propagateCard, propagateSet, dumpCards } from '../models/pokeDB.js';

const router = Router();

router.get('/card/add/:cardID', async (req, res) => {
  console.log('Getting card', req.params.cardID);
  /* getCard() returns JSON object via external pokemon TCG API, sends object to
   * propagateCard(), which brings the parts of the card we use into the database */
  const cardData = await getCard(req.params.cardID);
  await propagateCard(cardData);
  res.send("finished addCard");
});


/* Much like getCard, but calls external API to get all cards in a set, 
 * propagateSet() calls propagateCard() for every card in response 
 * note: Haven't implemented pagination handling, external API paginates
 * all responses upto 250 cards, need to handle pages */
router.get('/set/add/:setID', async (req, res) => {
  console.log('Getting set', req.params.cardID);
  const setData = await getSet(req.params.setID);
  await propagateSet(setData);
  res.send('added set');
});

/* Returns the contents of the database using a long SQL join chain, you get
 * basic information back; currently has multiple entries for every value point,
 * not very complicated. Need to learn better joins to only include latest price 
 * for this functions sake; separate function for value history on specific cards
 * would be ideal here. */
router.get('/dumpcards', async (req, res) => {
  const cardDump = await dumpCards();
  res.send(cardDump);
});
export default router;
