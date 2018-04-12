(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function(){

  const idb = require('idb');

  let dbPromise = idb.open('app-db', 1, function(upgradeDB) {
    var restaurants_store = upgradeDB.createObjectStore('restaurants', { keyPath: 'id' });
    restaurants_store.createIndex('id', 'id');

    var reviews_store = upgradeDB.createObjectStore('reviews', { keyPath: 'id' });
    reviews_store.createIndex('id', 'id');
    reviews_store.createIndex('restaurant_id', 'restaurant_id');
  });

  function storeRestaurants(restaurants) {
    return dbPromise.then(function(db){
      let tx = db.transaction('restaurants', 'readwrite');
      let store = tx.objectStore('restaurants');
      restaurants.forEach(function(restaurants){
        store.put(restaurants);
      });
      return tx.complete;
    });
  }
  function getRestaurants() {
    return new Promise(function(resolve, reject) {
      fetch(DBHelper.DATABASE_URL)
      .then(resp => resp.json())
      .then(json => { resolve(json); })
      .catch(error => {
        console.log(error);
        reject(error);
      });
    });
  }

  function storeReviews(reviews) {
    return dbPromise.then(function(db){
      let tx = db.transaction('reviews', 'readwrite');
      let store = tx.objectStore('reviews');
      reviews.forEach(function(review){
        store.put(review);
      });
      return tx.complete;
    });
  }
  function getReviews() {
    return new Promise(function(resolve, reject) {
      fetch(DBHelper.REVIEWS_URL)
      .then(resp => resp.json())
      .then(json => { resolve(json); })
      .catch(error => {
        console.log(error);
        reject(error);
      });
    });
  }

  /**
   * Common database helper functions.
   */
  class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
     static get DATABASE_URL() {
       const port = 1337 // Change this to your server port
       return `http://localhost:${port}/restaurants`;
     }

     static get RESTAURANTS_URL() {
       const port = 1337 // Change this to your server port
       return `http://localhost:${port}/restaurants`;
     }
     static get REVIEWS_URL() {
       const port = 1337 // Change this to your server port
       return `http://localhost:${port}/reviews`;
     }

    /**
     * Fetch all restaurants.
     */
     static fetchRestaurants(callback) {
       // check browser db first
       dbPromise.then(function(db){
         let tx = db.transaction('restaurants');
         let store = tx.objectStore('restaurants');
         store.getAll().then(function(restaurants){
           if(restaurants.length > 0) {
             // if data exists, return that
             console.log('returning restaurants from db...');
             return callback(null, restaurants);
           }
           else {
             // if no data exists, fetch data, store it into db, then return it
             console.log('fetching restaurants...');
             getRestaurants()
             .then(restaurants => {
               console.log('fetched. now storing...');
               storeRestaurants(restaurants)
               .then(() => {
                 console.log('stored. now returning...');
                 return callback(null, restaurants);
               })
             })
             .catch(error => {
               console.log(error);
               return callback('error fetching...', null);
             })
           }
         });
       });
     }

     static fetchReviews(restaurant_id, callback) {
       // check browser db first
       dbPromise.then(function(db){
         let tx = db.transaction('reviews');
         let store = tx.objectStore('reviews');
         store.getAll().then(function(reviews){
           if(reviews.length > 0) {
             // if data exists, return that
             console.log('returning reviews from db...');
             return restaurant_id ?
             callback(null, reviews.filter(r => Number(r.restaurant_id) === Number(restaurant_id))) :
             callback(null, reviews);
           }
           else {
             // if no data exists, fetch data, store it into db, then return it
             console.log('fetching reviews...');
             getReviews()
             .then(reviews => {
               console.log('fetched. now storing...');
               storeReviews(reviews)
               .then(() => {
                 console.log('stored. now returning...');
                 return restaurant_id ?
                 callback(null, reviews.filter(r => Number(r.restaurant_id) === Number(restaurant_id))) :
                 callback(null, reviews);
               })
             })
             .catch(error => {
               console.log(error);
               return callback('error fetching...', null);
             })
           }
         });
       });
     }

     static renderFavBtn(restaurant) {
       const favBtn = document.createElement('button');
       favBtn.setAttribute("id", `fav-btn-${restaurant.id}`);
       favBtn.setAttribute("title", `toggle favorites for: ${restaurant.name}`);
       favBtn.setAttribute("data-restaurant-id", restaurant.id);
       favBtn.className = 'fav-btn';
       favBtn.style.display = 'block';
       favBtn.style.margin = '10px 0px';
       favBtn.style.padding = '10px';
       favBtn.style.color = 'white';
       favBtn.style.border = '0px';
       favBtn.style.cursor = 'pointer';
       if(restaurant.is_favorite === "true" || restaurant.is_favorite === true) {
         favBtn.innerHTML = 'favorite!';
         favBtn.style.background = '#990000';
       }
       else {
         favBtn.innerHTML = 'add to favorite';
         favBtn.style.background = 'grey';
       }

       favBtn.addEventListener('click', function(){
         (function(){
           let restaurant_id = restaurant.id;
           DBHelper.toggleFavBtn(restaurant_id)
           // .then(function(){ console.log('toggled favorite!', restaurant_id); });
         })()
       })

       return favBtn;
     }

     static getRestaurantFromDB(restaurant_id) {
       return dbPromise.then(function(db){
         let tx = db.transaction('restaurants');
         let store = tx.objectStore('restaurants');
         return store.get(restaurant_id);
       })
     }

     static updateRestaurantInDB(new_restaurant) {
       return dbPromise.then(function(db){
         let tx = db.transaction('restaurants', 'readwrite');
         let store = tx.objectStore('restaurants');
         store.put(new_restaurant);
         return tx.complete.then(function(){
           return Promise.resolve(new_restaurant);
         });
       })
     }

     static syncRestaurant(restaurant) {
       try {
         let url = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`;
         let params = {method: 'PUT', headers: {'Content-Type': 'application/json'}};
         return fetch(url, params).then(function(r){ return r.json() });
       }
       catch(e) {
         console.log('error updating restaurant backend data...', e, restaurant);
       }
     }

     static syncRestaurants() {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('restaurants');
           let store = tx.objectStore('restaurants');
           return store.getAll();
         })
         .then(function(restaurants){
           let promises_list = [];
           restaurants.forEach(function(restaurant){
             promises_list.push(DBHelper.syncRestaurant(restaurant));
           });
           return Promise.all(promises_list);
         });
       }
       catch(e) {
         console.log('error syncing all restaurants...', e);
       }
     }

     static checkcReview(review) {
       try {
         let url = `http://localhost:1337/reviews/${review.id}`;
         return fetch(url).then(r => r.status);
       }
       catch(e) {
         console.log('error updating review backend data...', e, restaurant);
       }
     }

     static deleteTempReview(temp_id) {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('reviews', 'readwrite');
           let store = tx.objectStore('reviews');
           store.delete(temp_id);
           return tx.complete;
         });
       }
       catch(e) {
         console.log('error deleting temp review...', e);
       }
     }

     static postTempReview(review) {
       return new Promise(function(resolve, reject){
         let temp_id = review['id'];
         delete review['createdAt'];
         delete review['updatedAt'];
         delete review['id'];
         delete review['temp'];
         // console.log('posting: ', review);
         let params = {
           method: "POST",
           body: JSON.stringify(review),
           headers: {'Content-Type': 'application/json'}
         }
         fetch('http://localhost:1337/reviews/', params)
         .then(r => r.json()).then(j => {
           DBHelper.deleteTempReview(temp_id);
           return resolve(j);
         });
       });
     }

     static postTempReviews(temp_list) {
       try {
         let promises_list = [];
         temp_list.forEach(function(review){
           promises_list.push(DBHelper.postTempReview(review));
         });
         return Promise.all(promises_list)
         .then(function(reviews){
           // console.log(reviews);
           return storeReviews(reviews);
         })
         .catch(function(){ console.log('error syncing temp reviews...', e); });
       }
       catch(e) {
         console.log('error syncing temp reviews...', e);
       }
     }

     static syncReview(review) {
       try {
         let url = `http://localhost:1337/reviews/${review.id}`;
         let params = {
           method: 'PUT',
           body: JSON.stringify(review),
           headers: {'Content-Type': 'application/json'}
         };
         fetch(url, params).catch(e => {
           console.log({error: e, review: review})
         });
       }
       catch(e) {
         console.log('error updating review backend data...', e, review);
       }
     }

     static syncReviews() {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('reviews');
           let store = tx.objectStore('reviews');
           return store.getAll();
         })
         .then(function(local_reviews){
           var temp_list = local_reviews.filter(r => r.temp === true);
           DBHelper.postTempReviews(temp_list);

           return getReviews().then(function(reviews){
             for(let review of reviews) {
               let find_review = local_reviews.find(r => r.id === review.id && (!r.temp));
               if(!find_review){
                 let url = `http://localhost:1337/reviews/${review.id}`;
                 let params = {
                   method: 'DELETE',
                   headers: {'Content-Type': 'application/json'}
                 };
                 return fetch(url, params);
               }
               else {
                 return DBHelper.syncReview(find_review);
               }
             }
           })
         });
       }
       catch(e) {
         console.log('error syncing all reviews...', e);
       }
     }

     static toggleFavBtn(restaurant_id) {
       return new Promise(function(resolve, reject){
         DBHelper.getRestaurantFromDB(restaurant_id)
         .then(function(restaurant){
           var new_restaurant = Object.assign({}, restaurant);
           new_restaurant.is_favorite = (restaurant.is_favorite === 'true' || restaurant.is_favorite === true) ?
           'false' : 'true';
           DBHelper.syncRestaurant(new_restaurant);
           return DBHelper.updateRestaurantInDB(new_restaurant);
         })
         .then(function(new_restaurant){
           const favBtn = document.getElementById(`fav-btn-${new_restaurant.id}`);
           if(new_restaurant.is_favorite === 'true' || new_restaurant.is_favorite === true) {
             favBtn.innerHTML = 'favorite!';
             favBtn.style.background = '#990000';
           }
           else {
             favBtn.innerHTML = 'add to favorite';
             favBtn.style.background = 'grey';
           }
           return resolve();
         })
       })
     }

     static renderEditReviewBtn(review) {
       const editBtn = document.createElement('button');
       editBtn.setAttribute("id", `edit-btn-${review.id}`);
       editBtn.setAttribute("title", `edit this review`);
       editBtn.setAttribute("data-review-id", review.id);
       editBtn.setAttribute("data-restaurant-id", review.restaurant_id);
       editBtn.className = 'edit-btn';
       editBtn.style.margin = '10px 10px 0px 0px';
       editBtn.style.padding = '10px';
       editBtn.style.color = 'white';
       editBtn.style.border = '0px';
       editBtn.style.cursor = 'pointer';
       editBtn.style.borderRaduis = '20px';
       editBtn.innerHTML = 'edit';
       editBtn.style.background = '#A86500';

       return editBtn;
     }

     static renderDeleteReviewBtn(review) {
       const deleteBtn = document.createElement('button');
       deleteBtn.setAttribute("id", `delete-btn-${review.id}`);
       deleteBtn.setAttribute("title", `delete this review`);
       deleteBtn.setAttribute("data-review-id", review.id);
       deleteBtn.setAttribute("data-restaurant-id", review.restaurant_id);
       deleteBtn.className = 'delete-btn';
       deleteBtn.style.margin = '10px 10px 0px 0px';
       deleteBtn.style.padding = '10px';
       deleteBtn.style.color = 'white';
       deleteBtn.style.border = '0px';
       deleteBtn.style.cursor = 'pointer';
       deleteBtn.style.borderRaduis = '20px';
       deleteBtn.innerHTML = 'delete';
       deleteBtn.style.background = '#990000';

       deleteBtn.addEventListener('click', function(){
         (function(){
           let review_id = review.id;
           let review_name = review.name;
           var ask = window.confirm(`delete ${review_name}'s review?`);
           if(ask === false) { return }
           DBHelper.deleteReview(review_id)
           .then(function(){
             // console.log('review deleted!', review_id);
             document.getElementById(`review-li-${review_id}`).remove();
           });
         })()
       })

       return deleteBtn;
     }

     static deleteReview(review_id) {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('reviews', 'readwrite');
           let store = tx.objectStore('reviews');
           store.delete(review_id);
           try { DBHelper.syncReviews(); } catch(e) { console.log('error...', e); }
           return tx.complete;
         });
       }
       catch(e) {
         console.log('error deleting review...', e);
       }
     }

     static createReview(data) {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('reviews', 'readwrite');
           let store = tx.objectStore('reviews');
           data.id = (new Date()).valueOf();
           data.createdAt = (new Date()).valueOf();
           data.updatedAt = (new Date()).valueOf();
           data.restaurant_id = Number(data.restaurant_id);
           data.temp = true;
           // console.log('storing: ', data);
           store.put(data);
           try { DBHelper.syncReviews(); } catch(e) { console.log('error...', e); }
           return tx.complete.then(function(){ return Promise.resolve(data) });
         });
       }
       catch(e) {
         console.log('error deleting review...', e);
       }
     }

     static editReview(data, editing) {
       try {
         return dbPromise.then(function(db){
           let tx = db.transaction('reviews');
           let store = tx.objectStore('reviews');
           return store.get(editing.id);
         })
         .then(function(review){
           return dbPromise.then(function(db){
             let tx = db.transaction('reviews', 'readwrite');
             let store = tx.objectStore('reviews');
             let new_review = Object.assign({}, review, data, {updatedAt: (new Date()).valueOf()});
             store.put(new_review);
             try { DBHelper.syncReviews(); } catch(e) { console.log('error...', e); }
             return tx.complete.then(function(){ return Promise.resolve(new_review) });
           })
         });
       }
       catch(e) {
         console.log('error deleting review...', e);
       }
     }

     static submitReview(data, editing) {
       try {
         if(!editing) {
           // creating
           return DBHelper.createReview(data);
         }
         else {
           // editing
           return DBHelper.editReview(data, editing);
         }
       }
       catch(e) {
         console.log('error deleting review...', e);
       }
     }


    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
      // fetch all restaurants with proper error handling.
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          const restaurant = restaurants.find(r => r.id == id);
          if (restaurant) { // Got the restaurant
            callback(null, restaurant);
          } else { // Restaurant does not exist in the database
            callback('Restaurant does not exist', null);
          }
        }
      });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
      // Fetch all restaurants  with proper error handling
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          // Filter restaurants to have only given cuisine type
          const results = restaurants.filter(r => r.cuisine_type == cuisine);
          callback(null, results);
        }
      });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
      // Fetch all restaurants
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          // Filter restaurants to have only given neighborhood
          const results = restaurants.filter(r => r.neighborhood == neighborhood);
          callback(null, results);
        }
      });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
      // Fetch all restaurants
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          let results = restaurants;

          if (cuisine != 'all') { // filter by cuisine
            results = results.filter(r => r.cuisine_type == cuisine);
          }
          if (neighborhood != 'all') { // filter by neighborhood
            results = results.filter(r => r.neighborhood == neighborhood);
          }
          // console.log(results);
          callback(null, results);
        }
      });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
      // Fetch all restaurants
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          // Get all neighborhoods from all restaurants
          const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
          // Remove duplicates from neighborhoods
          const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
          callback(null, uniqueNeighborhoods);
        }
      });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
      // Fetch all restaurants
      DBHelper.fetchRestaurants((error, restaurants) => {
        if (error) {
          callback(error, null);
        } else {
          // Get all cuisines from all restaurants
          const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
          // Remove duplicates from cuisines
          const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
          callback(null, uniqueCuisines);
        }
      });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
      return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
      return (`/img/${restaurant.id}.jpg`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP}
      );
      return marker;
    }

  }

  window.DBHelper = DBHelper;

})()

},{"idb":2}],2:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }
  
  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());

},{}]},{},[1]);
