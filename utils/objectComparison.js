// import { log, error } from '../src/client/utils/logger';

/**
 * 2つのオブジェクトが等しいかどうかを比較します。
 * 
 * @param {Object} obj1 - 比較する1つ目のオブジェクト
 * @param {Object} obj2 - 比較する2つ目のオブジェクト
 * @returns {boolean} 2つのオブジェクトが等しい場合はtrue、そうでない場合はfalse
 */
export function areObjectsEqual(obj1, obj2) {
  try {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (obj1.constructor !== obj2.constructor) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(obj2, key) || obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  } catch (err) {
    // error('Error in areObjectsEqual:', err);
    return false;
  }
}

/**
 * オブジェクトの深い比較を行います。
 * 
 * @param {*} obj1 - 比較する1つ目の値
 * @param {*} obj2 - 比較する2つ目の値
 * @returns {boolean} 2つの値が等しい場合はtrue、そうでない場合はfalse
 */
export function deepEqual(obj1, obj2) {
  try {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (let key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  } catch (err) {
    // error('Error in deepEqual:', err);
    return false;
  }
}