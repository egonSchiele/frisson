import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./src/App";
import { store } from "./src/store";

const domNode = document.getElementById("root");
const root = ReactDOM.createRoot(domNode);
root.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);

const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();

document.addEventListener("copy", function (e) {
  const text_only = document
    .getSelection()
    .toString()
    .replaceAll("“", '"')
    .replaceAll("”", '"');
  // @ts-ignore
  const clipdata = e.clipboardData || window.clipboardData;

  clipdata.setData("text/plain", text_only);
  clipdata.setData("text/html", text_only);
  e.preventDefault();
});

window.addEventListener("scroll", (e) => {
  console.log("stop scrolling");
  e.preventDefault();
  window.scroll(0, 0);
});

//window.addEventListener("focus", (e) => window.location.reload());
