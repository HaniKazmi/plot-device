declare global {
  interface Map<K, V> {
    setIfAbsent(key: K, value: V): V;
    setIfAbsent(key: K, value: V): V;
  }
}

if (!Map.prototype.setIfAbsent) {
  Map.prototype.setIfAbsent = function <K, V>(key: K, value: V) {
    let val = (this as Map<K, V>).get(key);
    if (val === undefined) {
      this.set(key, value);
      val = value;
    }

    return val;
  };
}

export {};
