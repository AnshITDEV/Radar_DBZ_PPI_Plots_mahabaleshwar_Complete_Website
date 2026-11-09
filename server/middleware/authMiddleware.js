import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  try {
    const token = req.header("Authorization");
    if (!token)
      return res.status(401).json({ msg: "No token, authorization denied" });

    const verified = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = verified.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
}
