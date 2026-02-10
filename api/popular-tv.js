// api/popular-tv.js
import popular from "./popular.js";

export default function handler(req, res) {
  req.query = { ...(req.query || {}), media: "tv" };
  return popular(req, res);
}
