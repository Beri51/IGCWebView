/* global L */
/* global jQuery */
(function ($) {
    'use strict';

    var igcFile = null;
    var barogramPlot = null;
    var altitudeConversionFactor = 3.2808399; // Conversion from metres to required units
    var timezone = {
        zonename: "Europe/London",
        zoneabbr: "UTC",
        offset: 0,
        dst: false
    };
    
    var task = null;

       // new stuff
    
    function topoint(start, end) {
    var earthrad = 6378; // km
    var lat1 = start['lat'] * Math.PI / 180;
    var lat2 = end['lat'] * Math.PI / 180;
    var lon1 = start['lng'] * Math.PI / 180;
    var lon2 = end['lng'] * Math.PI / 180;
    var deltaLat = lat2 - lat1;
    var deltaLon = (end['lng'] - start['lng']) * Math.PI / 180;
    var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = earthrad * c;
    var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    var brng = (360 + Math.atan2(y, x) * 180 / Math.PI) % 360;
    return {
      distance: d,
      bearing: brng
    };
 }
    
   
    
   function getSectorDefs() {
       var startrad=5;  //start line radius
       var finrad= 1; //finish line radius
       var tprad= 0.5;  //'beer can' radius
       var sector_rad= 15; //tp sector radius
       var sector_angle= 90;  //tp sector
       var i;
       var heading;
       var legheadings=[];
       var sectors=[];
       var bisector;
       var reciprocal;
       for(i=1;i < task.coords.length; i++) {
               heading= topoint(task.coords[i-1],task.coords[i]).bearing;
             legheadings.push(heading);
       }
      for(i=0; i < task.coords.length; i++) {
          var sectordef={};
           switch(i) {
               case 0:   //start line
                   sectordef.radius=startrad;
                   sectordef.minbearing=legheadings[0]+90;
                   sectordef.maxbearing=legheadings[0]-90;
                   sectordef.barrel=0;
                   break;
               case task.coords.length-1:   //finish line
                   sectordef.radius= finrad;
                   sectordef.maxbearing=legheadings[i-1]+90;
                   sectordef.minbearing= legheadings[i-1] -90;
                  sectordef.barrel=0;
                   break;
               default:
                   sectordef.barrel=tprad;
                   sectordef.radius= sector_rad;
                    reciprocal=(legheadings[i-1] + 180)%360;
                    bisector =(reciprocal + legheadings[i])/2;
                     if (Math.abs(legheadings[i] - reciprocal) < 180) {
                              bisector = (bisector + 180) % 360;
                   }
                   sectordef.maxbearing=bisector +45;
                   sectordef.minbearing= bisector -45;
           }
           sectordef.maxbearing=(sectordef.maxbearing +360) % 360;
            sectordef.minbearing=(sectordef.minbearing +360) % 360;
             sectors[i]=sectordef;
    }
   return sectors;
   }
    
    function checksector(coords, point,sector) {
        var startpt= {
             lat: coords[0],
             lng: coords[1]
        };
        var posdata= topoint(task.coords[point],startpt);
        var maxbearing= sector.maxbearing;
        if(maxbearing < sector.minbearing)  {
            maxbearing +=360;
        } 
        if((posdata.distance < sector.barrel) || ((posdata.distance < sector.radius) && (posdata.bearing < maxbearing) && (posdata.bearing > sector.minbearing)))  {
           return true;
       }
        else {
           return false;
      }
    }
    
        function getPosInfo(recordTime, altitude) {
        var adjustedTime=new Date(recordTime + timezone.offset);
        var showTime=adjustedTime.getUTCHours() + ':' + pad(adjustedTime.getUTCMinutes()) + ':' + pad(adjustedTime.getSeconds());
        return showTime + ":  Altitude: " + (altitude* altitudeConversionFactor).toFixed(0) + " " + $('#altitudeUnits').val();
    }
    
       function analyseTask() {
         var insector;
        var i=0;
        var curLeg=0;
        var sectors= getSectorDefs();
         var fileover = igcFile.latLong.length;
        //var fileover=3000;
        var startTime;
        var appendLine;
        var tpindices=[];
        var instart;
        var legName;
        //read through file until in start sector
       do  {
            insector=checksector(igcFile.latLong[i],0,sectors[0]);
              i++;
        } 
        while((i < fileover) && (insector===false));
         do {
              if(curLeg < 2) {
                  instart=checksector(igcFile.latLong[i],0,sectors[0]);
                 if(curLeg===1) {
                      if(instart) {
                          curLeg=0;
                      }
                  }
                  else {
                      if(!(instart))  {
                          tpindices[0]=i;
                          startTime=igcFile.recordTime[i].getTime();
                           $('#startmsg').text("Started: " + getPosInfo(startTime,igcFile.pressureAltitude[i]));
                           curLeg=1;
                           }
                  }
              }
              if(curLeg > 0) {
              if (checksector(igcFile.latLong[i],curLeg,sectors[curLeg])) {
                           tpindices[curLeg]=i;
                           if(curLeg===(task.coords.length-1)) {
                                 legName="Finish";
                           }
                           else {
                               legName= "TP" + curLeg;
                           }
                           $('#startmsg').append("<br>" +legName +": " + getPosInfo(igcFile.recordTime[i].getTime(),igcFile.pressureAltitude[i]) );
                            curLeg++;
                    }
              }
           i++;
         }
        while ((i  < fileover) && (curLeg < task.coords.length));
       }
    //end of new stuff
    
    function showTask() {
        var i;
        var pointlabel;
        $('#taskbuttons').html("");
        $('#taskinfo').html("");
        for (i = 0; i < task.labels.length; i++) {
            $('#taskinfo').append('<tr><th>' + task.labels[i] + ':</th><td>' + task.names[i] + ':</td><td>' + task.descriptions[i] + '</td></tr>');
            switch (i) {
                case 0:
                    pointlabel = "Start";
                    break;
                case task.labels.length - 1:
                    pointlabel = "Finish";
                    break;
                default:
                    pointlabel = "TP" + i.toString();
            }
            $('#taskbuttons').append('&nbsp;<button>' + pointlabel + '</button>');
            $('#tasklength').text("Task length: " + task.distance.toFixed(1) + " Km");
            $('#task').show();
        }
    }

    function pointDescription(coords) {
        var latdegrees = Math.abs(coords['lat']);
        var latdegreepart = Math.floor(latdegrees);
        var latminutepart = 60 * (latdegrees - latdegreepart);
        var latdir = (coords['lat'] > 0) ? "N" : "S";
        var lngdegrees = Math.abs(coords['lng']);
        var lngdegreepart = Math.floor(lngdegrees);
        var lngminutepart = 60 * (lngdegrees - lngdegreepart);
        var lngdir = (coords['lng'] > 0) ? "E" : "W";

        var retstr = latdegreepart.toString() + "&deg;" + latminutepart.toFixed(3) + "&prime;" + latdir + " " + lngdegreepart.toString() + "&deg;" + lngminutepart.toFixed(3) + "&prime;" + lngdir;
        return retstr;
    }

    function clearTask(mapControl) {
        $('#taskinfo').html("");
        $('#tasklength').html("");
        $('#taskbuttons').html("");
        mapControl.zapTask();
        $('#task').hide();
        task = null;
    }

    //Get display information associated with task
    function maketask(points) {
        var i;
        var j = 1;
        var distance = 0;
        var leglength;
        var names = [];
        var labels = [];
        var coords = [];
        var descriptions = [];
        names[0] = points.name[0];
        labels[0] = "Start";
        coords[0] = points.coords[0];
        descriptions[0] = pointDescription(points.coords[0]);
        for (i = 1; i < points.coords.length; i++) {
            leglength = points.coords[i].distanceTo(points.coords[i - 1]);
            //eliminate situation when two successive points are identical (produces a divide by zero error on display. 
            //To allow for FP rounding, within 30 metres is considered identical.
            if (leglength > 30) {
                names[j] = points.name[i];
                coords[j] = points.coords[i];
                descriptions[j] = pointDescription(points.coords[i]);
                labels[j] = "TP" + j;
                distance += leglength;
                j++;
            }
        }
        labels[labels.length - 1] = "Finish";
        distance = distance / 1000;
        var retval = {
            names: names,
            labels: labels,
            coords: coords,
            descriptions: descriptions,
            distance: distance
        };
        //Must be at least two points more than 30 metres apart
        if (names.length > 1) {
            return retval;
        }
        else {
            return null;
        }
    }

    function getPoint(instr) {
        var latitude;
        var longitude;
        var pointname = "Not named";
        var matchref;
        var statusmessage = "Fail";
        var count;
        var pointregex = [
            /^([A-Za-z]{2}[A-Za-z0-9]{1})$/,
            /^([A-Za-z0-9]{6})$/,
            /^([\d]{2})([\d]{2})([\d]{3})([NnSs])([\d]{3})([\d]{2})([\d]{3})([EeWw])(.*)$/,
            /^([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})[\s]*([NnSs])[\W]*([0-9]{1,3}):([0-9]{1,2}):([0-9]{1,2})[\s]*([EeWw])$/,
            /^(\d{1,2})[\s:](\d{1,2})\.(\d{1,3})\s*([NnSs])\s*(\d{1,3})[\s:](\d{1,2})\.(\d{1,3})\s*([EeWw])$/
        ];
        for (count = 0; count < pointregex.length; count++) {
            matchref = instr.match(pointregex[count]);
            if (matchref) {
                switch (count) {
                    case 0:
                    case 1:
                        //BGA or Welt2000 point
                        $.ajax({
                            url: "findtp.php",
                            data: { postdata: matchref[0] },
                            timeout: 3000,
                            method: "POST",
                            dataType: "json",
                            async: false,
                            success: function (data) {
                                pointname = data.tpname;
                                if (pointname !== "Not found") {
                                    latitude = data.latitude;
                                    longitude = data.longitude;
                                    statusmessage = "OK";
                                }
                            }
                        });
                        break;
                    case 2:
                        //format in IGC file
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / 60000;
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / 60000;
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        if (matchref[9].length > 0) {
                            pointname = matchref[9];
                        }
                        statusmessage = "OK";

                        break;
                    case 3:
                        //hh:mm:ss
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / 3600;
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / 3600;
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        statusmessage = "OK";
                        break;
                    case 4:
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / (60 * (Math.pow(10, matchref[3].length)));
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / (60 * (Math.pow(10, matchref[7].length)));
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        statusmessage = "OK";
                        break;
                }
            }
        }

        return {
            message: statusmessage,
            coords: L.latLng(latitude, longitude),
            name: pointname
        };

    }

    function parseUserTask() {
        var input;
        var pointdata;
        var success = true;
        var taskdata = {
            coords: [],
            name: []
        }
        $("#requestdata :input[type=text]").each(function () {
            input = $(this).val().replace(/ /g, '');
            if (input.length > 0) {
                pointdata = getPoint(input);
                if (pointdata.message === "OK") {
                    taskdata.coords.push(pointdata.coords);
                    taskdata.name.push(pointdata.name);
                }
                else {
                    success = false;
                    alert("\"" + $(this).val() + "\"" + " not recognised-" + " ignoring entry");
                }
            }
        });
        if (success) {
            task = maketask(taskdata);
        }
        else {
            task = null;
        }
    }

    function displaydate(timestamp) {
        var daynames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var monthnames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return daynames[timestamp.getUTCDay()] + " " + timestamp.getUTCDate() + " " + monthnames[timestamp.getUTCMonth()] + " " + timestamp.getUTCFullYear();
    }

    //get timezone data from timezonedb.  Via php to avoid cross-domain data request from the browser
    //Timezone dependent processes run  on file load are here as request is asynchronous
    //If the request fails or times out, silently reverts to default (UTC)
    function gettimezone(igcFile, mapControl) {
        var flightdate = igcFile.recordTime[0];
        $.ajax({
            url: "gettimezone.php",
            data: {
                stamp: flightdate / 1000,
                lat: igcFile.latLong[0][0],
                lon: igcFile.latLong[0][1]
            },
            timeout: 3000,
            method: "POST",
            dataType: "json",
            success: function (data) {
                if (data.status === "OK") {
                    timezone.zonename = data.zoneName;
                    timezone.zoneabbr = data.abbreviation;
                    timezone.offset = 1000 * parseFloat(data.gmtOffset);
                    if (data.dst === "1") {
                        timezone.zonename += ", daylight saving";
                    }
                }
            },
            complete: function () {
                //Local date may not be the same as UTC date
                var localdate = new Date(flightdate.getTime() + timezone.offset);
                $('#datecell').text(displaydate(localdate));
                barogramPlot = plotBarogram(igcFile);
                updateTimeline(0, mapControl);
            }
        });
    }

    function pad(n) {
        return (n < 10) ? ("0" + n.toString()) : n.toString();
    }

    function plotBarogram() {
        var nPoints = igcFile.recordTime.length;
        var pressureBarogramData = [];
        var gpsBarogramData = [];
        var j;
        var timestamp;
        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime() + timezone.offset;
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j] * altitudeConversionFactor]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j] * altitudeConversionFactor]);
        }
        var baro = $.plot($('#barogram'), [{
            label: 'Pressure altitude',
            data: pressureBarogramData
        }, {
                label: 'GPS altitude',
                data: gpsBarogramData
            }],
            {
                axisLabels: {
                    show: true
                },
                xaxis: {
                    mode: 'time',
                    timeformat: '%H:%M',
                    axisLabel: 'Time (' + timezone.zonename + ')'
                },
                yaxis: {
                    axisLabel: 'Altitude / ' + $('#altitudeUnits').val()
                },

                crosshair: {
                    mode: 'xy'
                },

                grid: {
                    clickable: true,
                    autoHighlight: false
                }
            }
            );
        return baro;
    }

    function updateTimeline(timeIndex, mapControl) {
        var currentPosition = igcFile.latLong[timeIndex];
        //var positionText=positionDisplay(currentPosition);
        var positionText = pointDescription(L.latLng(currentPosition));
        var unitName = $('#altitudeUnits').val();
        //add in offset from UTC then convert back to UTC to get correct time in timezone!
        var adjustedTime = new Date(igcFile.recordTime[timeIndex].getTime() + timezone.offset);
        $('#timePositionDisplay').html(adjustedTime.getUTCHours() + ':' + pad(adjustedTime.getUTCMinutes()) + ':' + pad(adjustedTime.getSeconds()) + " " + timezone.zoneabbr + '; ' +
            (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (barometric) / ' +
            (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (GPS); ' +
            positionText);
        mapControl.setTimeMarker(timeIndex);

        barogramPlot.lockCrosshair({
            x: adjustedTime.getTime(),
            y: igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor
        });
    }

    function bindTaskButtons(mapControl) {
        $('#taskbuttons button').on('click', function (event) {
            var li = $(this).index();
            mapControl.showTP(task.coords[li]);
        });
    }

    function displayIgc(mapControl) {

        clearTask(mapControl);
        //check for user entered task- must be entry in start and finish
        if ($('#start').val().trim() && $('#finish').val().trim()) {
            parseUserTask();
        }
        //if user defined task is empty or malformed
        if (task === null) {
            if (igcFile.taskpoints.length > 4) {
                var i;
                var pointdata;
                var taskdata = {
                    coords: [],
                    name: []
                };
                //For now, ignore takeoff and landing
                for (i = 1; i < igcFile.taskpoints.length - 1; i++) {
                    pointdata = getPoint(igcFile.taskpoints[i]);
                    if (pointdata.message === "OK") {
                        taskdata.coords.push(pointdata.coords);
                        taskdata.name.push(pointdata.name);
                    }
                }
                if (taskdata.name.length > 1) {
                    task = maketask(taskdata);
                }
            }
        }

        if (task !== null) {
            showTask();
            mapControl.addTask(task.coords, task.labels);
            //Need to bind event after buttons are created
            bindTaskButtons(mapControl);
        }
        // Display the headers.
        var headerBlock = $('#headers');
        headerBlock.html('');
        //Delay display of date till we get the timezone
        var headerIndex;
        for (headerIndex = 0; headerIndex < igcFile.headers.length; headerIndex++) {
            headerBlock.append(
                $('<tr></tr>').append($('<th></th>').text(igcFile.headers[headerIndex].name))
                    .append($('<td></td>').text(igcFile.headers[headerIndex].value))
                );
        }
        $('#flightInfo').show();
        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or plotting the graph.
        $('#igcFileDisplay').show();
        mapControl.addTrack(igcFile.latLong);
        //Barogram is now plotted on "complete" event of timezone query
        gettimezone(igcFile, mapControl);
        // Set airspace clip altitude to selected value and show airspace for the current window
        mapControl.updateAirspace(Number($("#airclip").val()));
        //Enable automatic update of the airspace layer as map moves or zooms
        mapControl.activateEvents();
        $('#timeSlider').prop('max', igcFile.recordTime.length - 1);
    }

    function storePreference(name, value) {
        if (window.localStorage) {
            try {
                localStorage.setItem(name, value);
            }
            catch (e) {
                // If permission is denied, ignore the error.
            }
        }
    }

    $(document).ready(function () {
        var mapControl = createMapControl('map');
        var altitudeUnit = $('#altitudeUnits').val();
        if (altitudeUnit === 'feet') {
            altitudeConversionFactor = 3.2808399;
        }
        else {
            altitudeConversionFactor = 1.0;
        }

        $('#fileControl').change(function () {
            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        $('#errorMessage').text('');
                        mapControl.reset();
                        $('#timeSlider').val(0);
                        igcFile = parseIGC(this.result);

                        displayIgc(mapControl);
                    } catch (ex) {
                        if (ex instanceof IGCException) {
                            $('#errorMessage').text(ex.message);
                        }
                        else {
                            throw ex;
                        }
                    }
                };
                reader.readAsText(this.files[0]);
            }
        });

        $('#help').click(function () {
            window.open("igchelp.html", "_blank");
        });

        $('#about').click(function () {
            window.open("igcabout.html", "_blank");
        });

        $('#altitudeUnits').change(function (e, raisedProgrammatically) {
            var altitudeUnit = $(this).val();
            if (altitudeUnit === 'feet') {
                altitudeConversionFactor = 3.2808399;
            }
            else {
                altitudeConversionFactor = 1.0;
            }
            if (igcFile !== null) {
                barogramPlot = plotBarogram();
                updateTimeline($('#timeSlider').val(), mapControl);
            }

            if (!raisedProgrammatically) {
                storePreference("altitudeUnit", altitudeUnit);
            }
        });
  
        // We need to handle the 'change' event for IE, but
        // 'input' for Chrome and Firefox in order to update smoothly
        // as the range input is dragged.
        $('#timeSlider').on('input', function () {
            var t = parseInt($(this).val(), 10);
            updateTimeline(t, mapControl);
        });
        $('#timeSlider').on('change', function () {
            var t = parseInt($(this).val(), 10);
            updateTimeline(t, mapControl);
        });

        $('#airclip').change(function () {
            var clipping = $(this).val();
            if (igcFile !== null) {
                mapControl.updateAirspace(Number(clipping));
            }
            storePreference("airspaceClip", clipping);
        });

        $('#clearTask').click(function () {
            $("#requestdata :input[type=text]").each(function () {
                $(this).val("");
            });
            clearTask(mapControl);
        });

        $('#zoomtrack').click(function () {
            mapControl.zoomToTrack();
        });

        $('button.toggle').click(
            function () {
                $(this).next().toggle();
                if ($(this).next().is(':visible')) {
                    $(this).text('Hide');
                }
                else {
                    $(this).text('Show');
                }
            });

        $('#enterTask').click(function () {
            clearTask(mapControl);
            parseUserTask();
            showTask();
            mapControl.addTask(task.coords, task.labels);
            bindTaskButtons(mapControl);
        });

        $('#barogram').on('plotclick', function (event, pos, item) {
            if (item) {
                updateTimeline(item.dataIndex, mapControl);
                $('#timeSlider').val(item.dataIndex);
            }
        });
     
        $('#analyse').click(function() {
            $('#taskdata').show();
            analyseTask();
        });
        
        $('#closewindow').click(function() {
            $('#taskdata').hide();
        });
        
        var storedAltitudeUnit = '', airspaceClip = '';
        if (window.localStorage) {
            try {
                storedAltitudeUnit = localStorage.getItem("altitudeUnit");
                if (storedAltitudeUnit) {
                    $('#altitudeUnits').val(storedAltitudeUnit).trigger('change', true);
                }

                airspaceClip = localStorage.getItem("airspaceClip");
                if (airspaceClip) {
                    $('#airclip').val(airspaceClip);
                }
            }
            catch (e) {
                // If permission is denied, ignore the error.
            }
        }
    });

} (jQuery));
