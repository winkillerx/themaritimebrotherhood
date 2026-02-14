import fetch from "node-fetch";

const TMDB_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res){
  const { id, type } = req.query;
  if(!id || !type){
    return res.status(400).json({ error: "Missing id or type" });
  }
  const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${TMDB_KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const ca = j.results?.CA || {};
  res.status(200).json(ca);
}