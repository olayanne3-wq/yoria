export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.query?.token;
  const activityId = req.query?.activity_id;

  if (!token || !activityId) {
    return res.status(400).json({ error: "Missing token or activity_id" });
  }

  try {
    const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=time,velocity_smooth,heart_rate&key_by_type=true`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
