/**
 * Copyright (c) 2014, 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/*
 * Your customer ViewModel code goes here
 */
define([
  'ojs/ojcore',
  'knockout',
  'jquery',
  'ojs/ojChart',
  'ojs/ojtable',
  'ojs/ojarraytabledatasource',
  'ojs/ojknockout',
  'ojs/ojinputtext',
  'ojs/ojlabel',
  'ojs/ojbutton'],
 function(oj, ko, $) {

    function CustomerViewModel() {
      var self = this;

      var dataAPI_URL = 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF';
      self.searchfield = ko.observable("5003");
      // self.dataSource4 = ko.observable();
      //
      // self.fetchDepartments = function(){
      //   new self.DeptCollection().fetch()
      // }
















      self.data2 = ko.observableArray();
      self.datasource2 = new oj.ArrayTableDataSource(
        self.data2, {idAttribute: 'submission_date'}
      )

      self.buttonClick = function(event){
        console.log('Countries: ', event)

        $.ajax({
          url: 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF',
          headers: {
            'AEF_number': '5003'
          },
          type: 'GET',
          dataType: 'json',
          success: function(req) { console.log('hello!', req.items["0"]); },
          error: function(req, err) { console.log('boo!', err); }
        }).then(function (projects){
              console.log("projects ", projects.items)
              var tempArray = [];
              $.each(projects.items, function () {
                tempArray.push({
                  aef_number: this.aef_number,
                  aef_name: this.aef_name,
                  business_unit: this.business_unit,
                  submission_date: this.submission_date,
                  status: this.status
                });
              });
              self.data2(tempArray)
            });

      }



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
    return new CustomerViewModel();
  }
);
