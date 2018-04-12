(function(){

  let sw = null;

  if(navigator.serviceWorker && navigator.serviceWorker.register) {
    navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('serviceWorker registered!', registration);
      sw = registration;
    })
    .catch(error => {
      console.log(error);
    })
  }

})()
