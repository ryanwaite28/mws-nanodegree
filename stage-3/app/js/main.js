let restaurants, neighborhoods, cuisines;
let map
let blob_urls = {}
let restaurants_li = {}
let initialLoad = false;
window.markers = [];

const idb = require('idb');


/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();

}


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  setTimeout(lazyLoadImages, 2000);
});

lazyLoadImages = (event) => {
  var images_list = document.querySelectorAll('#restaurants-list li img');
  images_list.forEach(img => {
    let status = img.getAttribute("data-img-status");
    if(!status || status == "notloaded") {
      if(elementInViewport2(img)) {
        img.setAttribute("data-img-status", "loaded");
        let id = img.getAttribute('id');
        let restaurant_id = img.getAttribute('data-restaurant-id');
        let imgSrc = DBHelper.imageUrlForRestaurant({ id: restaurant_id });
        if(blob_urls[restaurant_id]){
          img.src = blob_urls[restaurant_id];
        }
        else {
          asyncLoadImage(imgSrc)
          .then((blob_url) => {
            blob_urls[restaurant_id] = blob_url;
            img.src = blob_urls[restaurant_id];
            console.log('lazy loaded: ', imgSrc);
          });
        }
      }
    }
  });
}



document.addEventListener('scroll', lazyLoadImages);
document.addEventListener('resize', lazyLoadImages);

// from: https://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
elementInViewport2 = (el) => {
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top < (window.pageYOffset + window.innerHeight) &&
    left < (window.pageXOffset + window.innerWidth) &&
    (top + height) > window.pageYOffset &&
    (left + width) > window.pageXOffset
  );
}


/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}


/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      if(initialLoad === false) {
        document.getElementById('map-container').style.display = 'block';
        initialLoad = true;
      }
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // console.log(self, restaurants);
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */

asyncLoadImage = (img_url) => {
  return new Promise(function(resolve, reject){
    fetch(img_url)
    .then(resp => resp.blob())
    .then(blob => {
      let blob_url = URL.createObjectURL(blob);
      return resolve(blob_url);
    })
  });
}

createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.setAttribute("data-restaurant", JSON.stringify(restaurant));

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute("alt", `${restaurant.name} (${restaurant.neighborhood})`);
  image.setAttribute("id", `restaurant-img-${restaurant.id}`);
  image.setAttribute("data-restaurant-id", restaurant.id);
  image.setAttribute("data-img-status", "notloaded");
  li.append(image);

  const div = document.createElement('div');
  div.className = 'restaurant-info-container';

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  div.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  div.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  div.append(address);

  const favBtn = DBHelper.renderFavBtn(restaurant);
  div.append(favBtn);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute("title", `See ${restaurant.name} details`);
  div.append(more);

  li.append(div);

  restaurants_li[restaurant.id] = li;

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
