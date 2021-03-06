/**
 * Copyright (c) 2014, 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/*
 * Your about ViewModel code goes here
 */
define(['ojs/ojcore', 'knockout', 'jquery', 'text!data/transportation.json', 'factories/CountryFactory', 'ojs/ojChart', 'ojs/ojtable', 'ojs/ojarraytabledatasource', 'ojs/ojcollectiontabledatasource', 'ojs/ojbutton'],
 function(oj, ko, $, file, CountryFactory) {

    function AboutViewModel() {
      var self = this;

      var data = [{name: "Pedestrians", items: [42]},
        {name: "Vehicles", items: [55]},
        {name: "Bicycles", items: [36]},
        {name: "Buses", items: [22]},
        {name: "Trains", items: [22]}];

      var filedata = JSON.parse(file)

      self.name = ko.observable("Kollin")
      self.datasource = ko.observableArray(data)
      self.transportation = ko.observableArray(filedata)


      // var countryCall = function(){
      //   countryCollection: CountryFactory.createCountryCollection(),
      //   datasource3: ko.observable(),
      //   initialize: function (){
      //     this.datasource3(new oj.CollectionTableDataSource(this.countryCollection));
      //     this.countryCollection.fetch();
      //   }
      // }




      self.data2 = ko.observableArray();
      var test = $.ajax({
        url: 'https://restcountries.eu/rest/v2/all'
      })
      console.log('Countries: ', test)

      $.ajax({
        url: 'https://restcountries.eu/rest/v2/all'
      }).
          then(function (countries){
            console.log("test", countries)
            var tempArray = [];
            $.each(countries, function () {
              tempArray.push({
                name: this.name,
                population: this.population,
                capital: this.capital
              });
            });
            self.data2(tempArray)
          });



      self.datasource2 = new oj.ArrayTableDataSource(
        self.data2, {idAttribute: 'name'}
      )



      // Below are a subset of the ViewModel methods invoked by the ojModule binding
      // Please reference the ojModule jsDoc for additional available methods.

      /**
       * Optional ViewModel method invoked when this ViewModel is about to be
       * used for the View transition.  The application can put data fetch logic
       * here that can return a Promise which will delay the handleAttached function
       * call below until the Promise is resolved.
       * @param {Object} info - An object with the following key-value pairs:
       * @param {Node} info.element - DOM element or where the binding is attached. This may be a 'virtual' element (comment node).
       * @param {Function} info.valueAccessor - The binding's value accessor.
       * @return {Promise|undefined} - If the callback returns a Promise, the next phase (attaching DOM) will be delayed until
       * the promise is resolved
       */
      self.handleActivated = function(info) {
        // Implement if needed
      };

      /**
       * Optional ViewModel method invoked after the View is inserted into the
       * document DOM.  The application can put logic that requires the DOM being
       * attached here.
       * @param {Object} info - An object with the following key-value pairs:
       * @param {Node} info.element - DOM element or where the binding is attached. This may be a 'virtual' element (comment node).
       * @param {Function} info.valueAccessor - The binding's value accessor.
       * @param {boolean} info.fromCache - A boolean indicating whether the module was retrieved from cache.
       */
      self.handleAttached = function(info) {
        // Implement if needed
      };


      /**
       * Optional ViewModel method invoked after the bindings are applied on this View.
       * If the current View is retrieved from cache, the bindings will not be re-applied
       * and this callback will not be invoked.
       * @param {Object} info - An object with the following key-value pairs:
       * @param {Node} info.element - DOM element or where the binding is attached. This may be a 'virtual' element (comment node).
       * @param {Function} info.valueAccessor - The binding's value accessor.
       */
      self.handleBindingsApplied = function(info) {
        // Implement if needed
      };

      /*
       * Optional ViewModel method invoked after the View is removed from the
       * document DOM.
       * @param {Object} info - An object with the following key-value pairs:
       * @param {Node} info.element - DOM element or where the binding is attached. This may be a 'virtual' element (comment node).
       * @param {Function} info.valueAccessor - The binding's value accessor.
       * @param {Array} info.cachedNodes - An Array containing cached nodes for the View if the cache is enabled.
       */
      self.handleDetached = function(info) {
        // Implement if needed
      };
    }

    /*
     * Returns a constructor for the ViewModel so that the ViewModel is constructed
     * each time the view is displayed.  Return an instance of the ViewModel if
     * only one instance of the ViewModel is needed.
     */
    return new AboutViewModel();
  }
);
