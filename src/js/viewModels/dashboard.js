define(['ojs/ojcore',
  'knockout',
  'jquery',
  'text!data/AEFsCreated.json',
  'ojs/ojchart',
  'ojs/ojtable',
  'ojs/ojarraytabledatasource',
  'ojs/ojcollectiontabledatasource',
  'ojs/ojbutton',
  'ojs/ojknockout',
  'ojs/ojsunburst',
  'ojs/ojtoolbar',
  'ojs/ojmodel'],
 function(oj, ko, $, file) {


    function DashboardViewModel() {
      var self = this;
      var filedata = JSON.parse(file)
      self.threeDValue = ko.observable('on');
      self.statusPieces = ko.observableArray();
      self.barChartDay = ko.observableArray();
      self.modeValue = ko.observable('single');
      var selection = [""];
      self.selectionValue = ko.observableArray(selection);
      self.selectionData = ko.observableArray();

      self.selectionTable = new oj.ArrayTableDataSource(
        self.selectionData, {idAttribute: 'aef_number'}
      )



//Selection Function

      self.selectionInfo = ko.pureComputed(function() {
        console.log("items", items)
          var items = "";
          console.log('name: ', items)
          var selection = self.selectionValue();
          if (selection.length > 0) {
            console.log("selection: ", selection)
            items += "items:<br/>";
            for(var i = 0; i < selection.length; i++) {
              items += "    " + selection[i] + "<br/>";
            }
          }

          if (selection == "Draft" || selection == "Submitted" || selection =="Resources Assigned" || selection == "Initial Review Meeting Completed" || selection == "Initiate Phase Approved"){
            var searchArray = [];
            $.ajax({
              // url: 'https://private-2124d-aefscreated.apiary-mock.com/questions',
              url: 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF',
              type: 'GET',
              dataType: 'json',
              success: function(req) { console.log('Status Request!', req); },
              error: function(req, err) { console.log('boo!', err); }
            }).then(function (AEFS){
              var AEFSItems = AEFS.items
              console.log("AEFS", AEFSItems)
              $.each(AEFSItems, function (i){
                // console.log(this.status, i)
                if (this.status == selection){
                  console.log("selected", selection)
                  submissionDate = this.submission_date.split(/[T]/)
                  searchArray.push({
                    aef_number: this.aef_number,
                    business_unit: this.business_unit,
                    submission_date: submissionDate[0],
                    status: this.status
                  });
                } else {
                  console.log("not selected", selection)
                }
              })
              console.log("search Array", searchArray)
              self.selectionData(searchArray)
            })
            // Create the table if a Day is selected
          } else if (selection == "Sunday" || selection == "Monday" || selection =="Tuesday" || selection == "Wednesday" || selection == "Thursday" || selection == "Friday" || selection == "Saturday"){
            console.log("Nope")
            var searchArray = [];
            $.ajax({
              // url: 'https://private-2124d-aefscreated.apiary-mock.com/questions',
              url: 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF',
              type: 'GET',
              dataType: 'json',
              success: function(req) { console.log('Status Request!', req); },
              error: function(req, err) { console.log('boo!', err); }
            }).then(function (AEFS){
              console.log("AEFS", AEFS.items)
              var AEFSdates = AEFS.items

              $.each(AEFSdates, function (i){
                var dateSplit = this.submission_date.split(/[.,\T/ -]/)

                var date = new Date(dateSplit[2], dateSplit[1], dateSplit[0])
                var weekday = new Array("Sunday", "Monday", "Tuesday", "Wednesday",
                          "Thursday", "Friday", "Saturday");

                var dayOfWeek = weekday[date.getDay()]
                console.log("day of week", dayOfWeek)
                if (dayOfWeek == selection){
                  console.log("selected", selection)
                  submissionDate = this.submission_date.split(/[T]/)
                  searchArray.push({
                    aef_number: this.aef_number,
                    business_unit: this.business_unit,
                    submission_date: submissionDate[0],
                    status: this.status
                  });
                } else {
                  console.log("not selected", selection)
                }
              })
              console.log("search Array", searchArray)
              self.selectionData(searchArray)
            })
          }
          return items;
        });


      $.ajax({
        // url: 'https://private-2124d-aefscreated.apiary-mock.com/questions',
        url: 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF',
        type: 'GET',
        dataType: 'json'
      }).then(function (stati){
        // console.log("stati: ", stati)
        var statusArray = [{name: "Draft", items: [{value: 0, id: 'series s1'}]},
                         {name: "Submitted", items: [{value: 0, id: 'series s1'}]},
                         {name: "Resources Assigned", items:[{value: 0, id: 'series s1'}]},
                         {name: "Initial Review Meeting Completed", items:[{value: 0, id: 'series s1'}]},
                         {name: "Initiate Phase Approved", items:[{value: 0, id: 'series s1'}]}];
        var statusEach = stati.items
        $.each(statusEach, function (i) {
          let obj = statusArray.find((o, i) => {
            if (o.name == this.status) {
              var thecurrentValue = statusArray[i].items[0].value
              var newValue = thecurrentValue + 1
              statusArray[i] = { name: this.status , items:[{value: newValue, id: this.status}]};
              return true; // stop searching
            }
          });
        });
        self.statusPieces(statusArray);
      });

      $.ajax({
        // url: 'https://private-2124d-aefscreated.apiary-mock.com/questions',
        url: 'http://140.86.34.224/ords/pdb1/exelon/aef/RequestAEF',
        type: 'GET',
        dataType: 'json'
      }).then(function (CreatedDates){
        // console.log("Dates: ", CreatedDates.items)
        var datesArray = [{name: "Sunday", items: [{value: 0, id: "Sunday"}]},
                           {name: "Monday", items: [{value: 0, id: "Monday"}]},
                           {name: "Tuesday", items: [{value: 0, id: "Tuesday"}]},
                           {name: "Wednesday", items: [{value: 0, id: "Wednesday"}]},
                           {name: "Thursday", items: [{value: 0, id: "Thursday"}]},
                           {name: "Friday", items: [{value: 0, id: "Friday"}]},
                           {name: "Saturday", items: [{value: 0, id: "Saturday"}]}];

        var datesEach = CreatedDates.items
        $.each(datesEach, function (i) {
          var dateSplit = this.submission_date.split(/[.,\T/ -]/)
          // console.log("datesplit", dateSplit[0], dateSplit[1], dateSplit[2], "SPLIT ", dateSplit[3])
          var date = new Date(dateSplit[2],dateSplit[1], dateSplit[0])
          var weekday = new Array("Sunday", "Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday");
          var dayOfWeek = weekday[date.getDay()]
          let obj = datesArray.find((o, i) => {
            if (o.name === dayOfWeek) {
              var thecurrentValue = datesArray[i].items[0].value
              var newValue = thecurrentValue + 1
              datesArray[i] = { name: dayOfWeek , items: [{value: newValue, id: dayOfWeek}]};
              return true; // stop searching
            }
          });
        });
        self.barChartDay(datesArray);
      });


      self.Pie = ko.observableArray(filedata)
      self.statusPie = new oj.ArrayTableDataSource(
        self.Pie,
        {idAttribute: 'status'}
      )

      self.stackValue = ko.observable('off');
      self.orientationValue = ko.observable('vertical');
      var barGroups = ["Day Submitted"];
      var barSeries = [{name: "Sunday", items: [42]},
                         {name: "Monday", items: [15]},
                         {name: "Tuesday", items: [36]},
                         {name: "Wednesday", items: [15]},
                         {name: "Thursday", items: [32]},
                         {name: "Friday", items: [29]},
                         {name: "Saturday", items: [22]}];

      self.barSeriesValue = ko.observableArray(barSeries);
      self.barGroupsValue = ko.observableArray(barGroups);



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
    return new DashboardViewModel();
  }
);
