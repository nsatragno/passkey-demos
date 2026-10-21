/*
 * Shared protocol between the deck (index.html) and the presenter window
 * (presenter.html). Both are same-origin pages, so a BroadcastChannel is
 * enough: no server needed, works on GitHub Pages and localhost.
 *
 * presenter → deck:
 *   { type: 'hello' }                          ask the deck for its state
 *   { type: 'cmd', cmd: 'next' | 'prev', id }
 *   { type: 'cmd', cmd: 'goto', slide, step, id }  slide is 1-based
 *
 * deck → presenter:
 *   { type: 'state', slide, slideCount, step, stepCount, title,
 *     slideNotes,  // notes for the whole slide
 *     notes,       // notes for the step currently showing / playing
 *     nextNotes,   // notes for what the next press will do
 *     nextTitle,   // title of the following slide
 *     playing,     // true while an animation runs
 *     ack }        // id of the command this state answers, if any
 */
(function () {
  'use strict';
  const NAME = 'alg-upgrades-deck';
  window.DeckSync = {
    NAME,
    open() {
      return 'BroadcastChannel' in window ? new BroadcastChannel(NAME) : null;
    },
  };
})();
