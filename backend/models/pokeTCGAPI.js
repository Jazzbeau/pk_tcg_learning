import axios from "axios";

// This handles external API requests via Axios; the responses here are usually passed back to router 
// and then passed on to database handlers, responses from these functions are the RAW JSON data.

export async function getCard(cardID) {
  try {
    const response = await axios.get(`https://api.pokemontcg.io/v2/cards/${cardID}`);
    return response.data.data; // Pokemon API wraps everything in 'data', and axios does the same.
  } catch (err) {
    console.error("Pokemon API error:", err);
    throw err;
  }
}

// This is more accurately getting set card contents; the actual */sets/ route returns exclusively set data;
// this API query instead fetches all CARD data containing the setID passed to the function. 
export async function getSet(setID) {
  try {
    const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:${setID}`);
    // This is paginated and needs to be handled correctly! Todo.
    return response.data.data; // Pokemon API wraps everything in 'data', and axios does the same.
  } catch (err) {
    console.error("Pokemon API error:", err);
    throw err;
  }
}

