(function(){

  let restaurant;
  var map;
  let editing = false;
  let editingBtn;
  let submitBtn;


  /**
   * Initialize Google map, called from HTML.
   */
  window.initMap = () => {
    try {
      DBHelper.syncReviews().then(function(){ init() })
    }
    catch(e) {
      console.log('error: could not sync reviews...');
      init();
    }
  }

  function init() {
    editingBtn = document.getElementById('cancel-editing-btn');
    editingBtn.addEventListener('click', function(){ setEditing(); });

    submitBtn = document.getElementById('submit-form-btn');
    submitBtn.addEventListener('click', function(){ submitReview() });

    fetchRestaurantFromURL((error, restaurant) => {
      setEditing();
      if (error) { // Got an error!
        console.error(error);
      } else {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });
        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
        DBHelper.fetchReviews(self.restaurant.id, (error, reviews) => {
          // fill reviews
          fillReviewsHTML(reviews);
        });
      }
    });
  }

  function submitReview() {
    var formdata = getFormValues();
    if(!/[a-zA-Z]{2,}$/gi.test(formdata.name)) {
      alert('name input must be letters only, minimum of 2 characters');
      return;
    }
    if(!/[1-5]{1}$/gi.test(formdata.rating)) {
      alert('rating input must be a number, 1-5');
      return;
    }
    if(formdata.comments.length < 3) {
      alert('comments input must be minimum of 3 characters');
      return;
    }

    if(!editing) {
      formdata.restaurant_id = Number(getParameterByName('id'));
    }
    // console.log(editing, formdata);

    try {
      DBHelper.submitReview(formdata, editing)
      .then(function(review){
        let alertMSG = editing ? 'Edited Review!' : 'Created Review!';
        // console.log(alertMSG, review);
        alert(alertMSG);
        let new_review_em = createReviewHTML(review);
        if(editing) {
          let old_review_em = document.getElementById(`review-li-${review.id}`);
          let parent_em = old_review_em.parentElement;
          parent_em.replaceChild(new_review_em, old_review_em);
        }
        else {
          const ul = document.getElementById('reviews-list');
          ul.appendChild(new_review_em);
        }
        setEditing();
        var element = document.getElementById(`review-li-${review.id}`);
        if(element.scrollIntoView && element.scrollIntoView.constructor === Function) {
          element.scrollIntoView(true);
        }
      })
      .catch(function(e){
        console.log('error...', e);
        var msg = editing ?
        'Could not edit this review. please try again later.' :
        'Could not create review. Please Check network connection.';
        alert(msg);
      });
    }
    catch(e) {
      console.log('error...', e);
      var msg = editing ?
      'Could not edit this review. please try again later.' :
      'Could not create review. Please Check network connection.';
      alert(msg);
    }
  }

  function getFormValues() {
    return {
      name: document.getElementById('name-field').value.trim(),
      rating: document.getElementById('rating-field').value.trim(),
      comments: document.getElementById('comments-field').value.trim()
    }
  }

  function setEditing(review) {
    if(review) {
      editing = review;
      document.getElementById('form-header').innerHTML = `Edit ${editing.name}'s review`;
      document.getElementById('name-field').value = editing.name;
      document.getElementById('rating-field').value = editing.rating;
      document.getElementById('comments-field').value = editing.comments;
      editingBtn.style.display = 'block';
    }
    else {
      editing = false;
      document.getElementById('form-header').innerHTML = `Create a review`;
      document.getElementById('name-field').value = '';
      document.getElementById('rating-field').value = '';
      document.getElementById('comments-field').value = '';
      editingBtn.style.display = 'none';
    }
  }


  function goToBottom() {
    window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
  }


  /**
   * Get current restaurant from page URL.
   */
  fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
      callback(null, self.restaurant)
      return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      error = 'No restaurant id in URL'
      callback(error, null);
    } else {
      DBHelper.fetchRestaurantById(id, (error, restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          console.error(error);
          return;
        }
        fillRestaurantHTML();
        callback(null, restaurant)
      });
    }
  }

  /**
   * Create restaurant HTML and add it to the webpage
   */
  fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.setAttribute("alt", `${restaurant.name} (${restaurant.neighborhood})`);
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    const favBtn = DBHelper.renderFavBtn(restaurant);
    document.getElementById('restaurant-container').appendChild(favBtn);

    // fill operating hours
    if (restaurant.operating_hours) {
      fillRestaurantHoursHTML();
    }

  }

  /**
   * Create restaurant operating hours HTML table and add it to the webpage.
   */
  fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
      const row = document.createElement('tr');

      const day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      const time = document.createElement('td');
      time.innerHTML = operatingHours[key];
      row.appendChild(time);

      hours.appendChild(row);
    }
  }

  /**
   * Create all reviews HTML and add them to the webpage.
   */
  fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    title.className = 'text-center';
    container.appendChild(title);

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  }

  determineRatingClass = (ratingNumber) => {
    let className;
    if(ratingNumber <= 2) {
      className = 'rating-bad';
    }
    if(ratingNumber == 3) {
      className = 'rating-fair';
    }
    if(ratingNumber >= 4) {
      className = 'rating-good';
    }
    return className;
  }

  /**
   * Create review HTML and add it to the webpage.
   */
  createReviewHTML = (review) => {
    const li = document.createElement('li');
    li.setAttribute("id", `review-li-${review.id}`);
    li.setAttribute("data-restaurant-id", review.restaurant_id);

    const name = document.createElement('p');
    name.setAttribute("id", `review-name-${review.id}`);
    name.innerHTML = review.name;
    name.className = 'review-name';
    li.appendChild(name);

    const div = document.createElement('div');
    div.className = 'review-info-container';

    const created = document.createElement('p');
    created.innerHTML = '<span>' +
    '<strong>Created:</strong> ' + (new Date(review.createdAt)).toDateString() +
    '</span>';
    created.style.fontSize = '1.25rem';
    div.appendChild(created);

    const updated = document.createElement('p');
    updated.innerHTML = '<span>' +
    '<strong>Updated:</strong> ' + (new Date(review.updatedAt)).toDateString() +
    '</span>';
    updated.style.fontSize = '1.25rem';
    div.appendChild(updated);

    const rating = document.createElement('p');

    const ratingSpan = document.createElement('span');
    ratingSpan.setAttribute("id", `rating-${review.id}`);
    ratingSpan.className = determineRatingClass(review.rating);
    ratingSpan.className += " rating-span";
    ratingSpan.innerHTML = `Rating: ${review.rating}`;

    rating.appendChild(ratingSpan);
    div.appendChild(rating);

    const comments = document.createElement('p');
    comments.setAttribute("id", `review-comments-${review.id}`);
    comments.innerHTML = review.comments;
    comments.style.fontSize = '1.0rem';
    div.appendChild(comments);

    const deleteBtn = DBHelper.renderDeleteReviewBtn(review);
    div.appendChild(deleteBtn);

    const editBtn = DBHelper.renderEditReviewBtn(review);
    editBtn.addEventListener('click', function(){
      (function(){
        let this_review = review;
        setEditing(this_review);
        goToBottom();
      })()
    })
    div.appendChild(editBtn);

    li.append(div);

    return li;
  }

  /**
   * Add restaurant name to the breadcrumb navigation menu
   */
  fillBreadcrumb = (restaurant=self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
  }

  /**
   * Get a parameter by name from page URL.
   */
  getParameterByName = (name, url) => {
    if (!url)
      url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
      results = regex.exec(url);
    if (!results)
      return null;
    if (!results[2])
      return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  formatDate = (date_num) => {
    var date = new Date(date_num);
  }


})()
