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

export function isState(stateInfo, stateName) {
  return stateInfo && stateInfo.state === stateName;
}

export function wrap(s) {
  return s.replace(/(?![^\n]{1,15}$)([^\n]{1,15})\s/g, "$1\n");
}

export function genUUID() {
  return Math.floor(Math.random() * 1e9);
}

export function arrRemove(arr, item) {
  let idx;
  if (typeof item === "function") {
    idx = arr.findIndex(item);
  } else {
    idx = arr.indexOf(item);
  }
  if (idx !== -1) arr.splice(idx, 1);
  return arr;
}

export function copyCoords(arr) {
  return arr.map((a) => Array.from(a));
}
