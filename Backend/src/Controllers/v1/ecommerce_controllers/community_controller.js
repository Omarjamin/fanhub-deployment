import jwt from 'jsonwebtoken';

class CommunityController {
  async enterBini(req, res) {
    try {
        


      const user = req.user; // make sure req.user exists
      console.log("Authenticated user:", user);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 2️⃣ Gumawa ng temporary token valid for 5 minutes
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, community: 1 },
        process.env.TEMP_JWT_SECRET, // secret key for temp tokens
        { expiresIn: '5m' } // valid for 5 minutes
      );

      // 3️⃣ I-return sa browser
      return res.json({
        community: 1,
        status: "entered",
        message: "Welcome to BINI community!",
        tempToken // <-- ito lang ang ipapasa sa BINI
      });

    } catch (err) {
      console.error("enterBini error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default CommunityController;
