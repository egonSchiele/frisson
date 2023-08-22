import fs from "fs";
import { stripPrefix } from "../utils.js";
import path from "path";

export function processDir(
  app,
  dir: string,
  prefixToStrip: string,
  method: "GET" | "POST" | "PUT" | "DELETE"
) {
  fs.readdir(dir, (readFileErr, files: string[]) => {
    if (!files) {
      console.log("No files found in", dir);
      return;
    }
    files.forEach(async (file) => {
      const requirePath = path.join(dir, file);
      const stats = fs.statSync(requirePath);
      if (stats.isDirectory()) {
        processDir(app, requirePath, prefixToStrip, method);
        return;
      }

      let routeName = stripPrefix(requirePath, prefixToStrip).replace(
        /.js$/,
        ""
      );
      if (routeName === "index") routeName = "/";

      const routeComponents = routeName.split("/");
      const routeComponentsWithParams = routeComponents.map((component) => {
        if (component.startsWith("[") && component.endsWith("]")) {
          return ":" + component.slice(1, -1);
        }
        return component;
      });
      routeName = routeComponentsWithParams.join("/");

      const m = await import("../../../" + requirePath);

      if (m.disabled) {
        console.log("DISABLED", method, routeName, "->", requirePath);
      } else {
        console.log(method, routeName, "->", requirePath);
        if (m.middleware) {
          app[method.toLowerCase()](routeName, ...m.middleware, m.default);
        } else {
          app[method.toLowerCase()](routeName, m.default);
        }
      }
    });
  });
}
