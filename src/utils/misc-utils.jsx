// when fn is `({ name }) => name`, turns
//
//  [
//    { name: "Zeta", age: 30 },
//    { name: "Aloy", age: 40 },
//  ];
//
// to
//
//  {
//    "Zeta": { name: "Zeta", age: 30 },
//    "Aloy": { name: "Aloy", age: 40 },

import { useCallback, useEffect, useRef, useState } from "react";

//  };
export function mapBy(objs, fn) {
  const newObjs = Object.groupBy(objs, fn);

  for (const key of Object.keys(newObjs)) {
    newObjs[key] = newObjs[key][0];
  }

  return newObjs;
}

function get(object, path, defaultValue) {
  const parts = path.split(".");
  for (let part of parts) {
    if (!object) return defaultValue;
    object = object[part];
  }
  return object ?? defaultValue;
}

function pick(fn) {
  return typeof fn === "string" ? (v) => get(v, fn) : fn;
}

export function sortBy(array, fn) {
  fn = pick(fn);
  return array.sort((a, b) => {
    const va = fn(a);
    const vb = fn(b);
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
}

export function useStateRef(val) {
  const [state, _setState] = useState(val);
  const stateRef = useRef(val);

  useEffect(() => void (stateRef.current = state), [state]);

  const setState = useCallback((v) => {
    if (typeof v === "function")
      _setState((curVal) => (stateRef.current = v(curVal)));
    else _setState((stateRef.current = v));
  }, []);

  return [state, setState, stateRef];
}

export function isNonTransitionState(stateInfo, stateName) {
  return stateInfo && stateInfo.state === stateName && !stateInfo.transitioning;
}

export function isTransitionState(stateInfo, stateName) {
  return stateInfo && stateInfo.state === stateName && stateInfo.transitioning;
}
