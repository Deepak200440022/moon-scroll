/* Explore Beyond — top navigation.
   Wires the brand-bar links: each smooth-scrolls the page to the
   story position given by its data-p attribute. */

function init(ctx) {
  var links = document.querySelectorAll('#nav .links a');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (e) {
      e.preventDefault();
      var pp = parseFloat(this.getAttribute('data-p')) || 0;
      var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      window.scrollTo({ top: pp * max, behavior: 'smooth' });
    });
  }
}

const nav = { init: init };

export default nav;
