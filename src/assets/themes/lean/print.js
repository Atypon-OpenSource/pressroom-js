"use strict";

(function () {
  var htmlPrint = {
    yearMonth: '',
    init: function init() {
      this.reorderFigures();
    },
    reorderFigures: function reorderFigures() {
      var $imageFigures = document.querySelectorAll('figure.figure');
      var $tableFigures = document.querySelectorAll('figure.table');
      this.orderFigures($imageFigures);
      this.orderFigures($tableFigures);
    },
    orderFigures: function orderFigures($figures) {
      for (var i = 0; i < $figures.length; i += 1) {
        var labels = $figures[i].querySelectorAll('label'),
          captions = $figures[i].querySelectorAll('figcaption'),
          label = this.getFigureLabel(labels, $figures[i]),
          caption = this.getFigCaption(captions),
          isCaptionEmpty = caption.textContent.trim() === '';
        if (label && caption) {
          caption.innerHTML = isCaptionEmpty ? "<strong class=\"figure-label\"> ".concat(label.textContent, " <strong/>") : "<strong class=\"figure-label\"> ".concat(label.textContent, ": </strong> ").concat(caption.textContent);
          $figures[i].removeChild(label);
        }
      }
    },
    getFigCaption: function getFigCaption(captions) {
      var caption;
      for (var i = 0; i < captions.length; i++) {
        caption = captions[i];
        if (captions.length > 1) {
          if (i > 0) {
            caption.textContent = "".concat(captions[i - 1].textContent, " ").concat(caption.textContent);
            captions[i].parentNode.removeChild(captions[i - 1]);
          }
        }
      }
      return caption;
    },
    getFigureLabel: function getFigureLabel(labels, figure) {
      var label;
      for (var i = 0; i < labels.length; i++) {
        var isFigureLabel = labels[i].parentNode === figure,
          isNotEmpty = labels[i].textContent.trim() !== '';
        if (isFigureLabel && isNotEmpty) {
          label = labels[i];
        }
      }
      return label;
    },
    getJournalTitle: function getJournalTitle() {
      var journalTitle = document.querySelector('[data-journal]');
      return "".concat(journalTitle && "".concat(journalTitle.getAttribute('data-journal')));
    },
    getFooterLeftText: function getFooterLeftText(_) {
      htmlPrint.getCurrentMonthYear();
      var journalTitle = htmlPrint.getJournalTitle();
      var doi = document.querySelector('[pub-id-type="doi"]');
      return "".concat("".concat(journalTitle, " \u2022 "), " ", htmlPrint.yearMonth, "\n            ").concat(doi && " \u2022 ".concat(doi.innerHTML));
    },
    getCurrentMonthYear: function getCurrentMonthYear(_) {
      var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      var date = new Date();
      htmlPrint.yearMonth = "".concat(monthNames[date.getMonth()], " ").concat(date.getFullYear());
    }
  };
  htmlPrint.init();
  Prince.addScriptFunc('getFooterLeftText', htmlPrint.getFooterLeftText);
  Prince.addScriptFunc('getJournalTitle', htmlPrint.getJournalTitle);
})();