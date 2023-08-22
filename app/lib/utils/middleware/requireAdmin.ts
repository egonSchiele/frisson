import { getUser } from "../../authentication/firebase.js";
import { stringToHash } from "../crypto.js";

const mainPageUrl =
  process.env.NODE_ENV === "production"
    ? "https://egonschiele.github.io/chisel-docs/"
    : "/login.html";

export const requireAdmin = (req, res, next) => {
  const c = req.cookies;
  /*   console.log({ req });
   */
  if (!req.cookies.userid) {
    console.log("no userid");
    res.redirect(mainPageUrl);
  } else {
    stringToHash(req.cookies.userid).then(async (hash) => {
      if (hash !== req.cookies.token) {
        res.redirect(mainPageUrl);
      } else {
        const user = await getUser(req);
        if (!user.admin) {
          res.redirect(mainPageUrl);
        } else {
          next();
        }
      }
    });
  }
};
