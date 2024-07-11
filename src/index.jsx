// generated using `generate_index.py`

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const App = React.lazy(() => import("./App"));

const Loader = () => {
  return (
    <section className="sec-loading">
      <div className="one"></div>
    </section>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.Suspense fallback={<Loader />}>
    <App />
  </React.Suspense>
);
