/* global Module*

/* Magic Mirror
*  Module: mm-digitraffic-trains
*
*  Add this to config.js:


*
*  By Marko Kuosmanen http://github.com/kuosman
*  MIT Licenced.
*/
Module.register("mm-digitraffic-trains", {

    // Default module config.
    defaults: {
        icon: "train", // See: https://fontawesome.com/icons?d=gallery
        showIcon: true,
        station: "KRS", // See: https://rata.digitraffic.fi/api/v1/metadata/stations
        updateInterval: 2500,
        trainCount: 6,
        initialLoadDelay: 0, // 0 seconds delay,
        showOnlyDestinations: []
    },
    stationsCache: null,
    updateTimer: null,
    firstTimeLoaded: false,
    error: false,

    // Override get styles.
    getStyles: function () {
        return [
            this.file("css/all.min.css"), // Font Awesome
            this.file("css/mm-digitraffic-trains.css")
        ]
    },

    // Override get translations
    getTranslations: function () {
        return {
            en: "translations/en.json",
            fi: "translations/fi.json"
        };
    },

    // Override dom generator.
    getDom: function () {
        var self = this;
        // If not getted stations then show loading message
        if (self.stationsCache === null) {
            self.sendSocketNotification("GET_STATIONS");
            var wrapper = document.createElement("div");
            wrapper.innerHTML = self.translate("LOADING");
            wrapper.className = "light small loading";
            return wrapper;
        }

        // If showOnLyDestinations then filter trains so at there is only wanted destinations
        if (self.config.showOnlyDestinations.length > 0) {
            self.trains = self.trains.filter(function(train){
                return self.config.showOnlyDestinations.includes(self.stationsCache[train.destination]);
            });
        }
        // If not trains then show no timetable message
        if (this.trains.length === 0) {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = self.translate("NO_TIMETABLE");
            wrapper.className = "light small no-timetables";
            return wrapper;
        }

        // Create dom
        var table = document.createElement("table");

        // Header
        var row = document.createElement("tr");
        table.appendChild(row);

        var headers = [
            {
                text: self.translate("DEPARTURE_TIME"),
                cls: "departure-time"
            }, {
                text: self.translate("TRAIN"),
                cls: "train"
            }, {
                text: self.translate("DESTINATION"),
                cls: "destination"
            }, {
                text: self.translate("TRACK"),
                cls: "header-raide"
            }];

        // Loop headers and create table row th's
        headers.forEach(function (header) {
            var cell = document.createElement("th");
            cell.className = "light small header " + header.cls || "";
            cell.innerHTML = header.text || "";
            row.appendChild(cell);
        });

        // Generate train's timetable
        this.trains.forEach(function (train) {
            var row = document.createElement("tr");

            // icon
            var icon = "";
            if (self.config.showIcon === true) {
                icon = "<span class='icon'><i class='fas fa-" + self.config.icon + "'></i></span>";
            }

            // time
            var timeCell = document.createElement("td");
            var scheduledTime = train.scheduledTime;
            var estimateTime = train.estimateTime;
            var timeCellContent = scheduledTime;
            if (scheduledTime != estimateTime) {
                timeCellContent += "<span class='icon'><i class='fas fa-arrow-right'></i></span><span class='light small late'>" + estimateTime + "</span>";
            }
            if (train.cancelled) {
                timeCellContent += "<span class='cancelled'> " + self.translate("CANCELLED") + " </span>";
            }
            timeCell.innerHTML = icon + timeCellContent;
            timeCell.className = "light small";
            row.appendChild(timeCell);

            // line
            var lineCell = document.createElement("td");
            lineCell.innerHTML = train.lineID;
            lineCell.className = "light small line";
            row.appendChild(lineCell);

            // destination
            var destinationCell = document.createElement("td");
            destinationCell.innerHTML = self.stationsCache[train.destination];
            destinationCell.className = "light small";
            row.appendChild(destinationCell);

            // track
            var trackCell = document.createElement("td");
            trackCell.innerHTML = train.track;
            trackCell.className = "light small track";
            row.appendChild(trackCell);

            table.appendChild(row);
        });

        // If error, then show error message
        if (this.error === true) {
            var row = document.createElement("tr");
            var errorCell = document.createElement("td");
            var errorIcon = "<span class='icon'><i class='fas fa-exclamation-triangle'></i></span>"
            errorCell.innerHTML = errorIcon + self.translate("TIMETABLE_ERROR");
            errorCell.className = "light small line error";
            errorCell.setAttribute("colspan", "4");
            row.appendChild(errorCell);
            table.appendChild(row);
        }

        return table;
    },
    // Schedule next fetch
    scheduleNextFetch: function () {
        var self = this;
        var delay = self.config.updateInterval || 60 * 1000;

        if (self.firstTimeLoaded === false && self.stationsCache === null) {
            self.sendSocketNotification("GET_STATIONS");
        } else if (self.firstTimeLoaded === false && self.stationsCache !== null) {
            self.sendSocketNotification("CONFIG", self.config);
            self.firstTimeLoaded = true;
        } else {
            clearTimeout(this.updateTimer);

            self.updateTimer = setTimeout(function () {
                self.sendSocketNotification("CONFIG", self.config);
            }, delay);
        }
    },

    notificationReceived: function (notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            this.scheduleNextFetch();
        }
    },

    socketNotificationReceived: function (notification, payload) {
        switch (notification) {
            case 'STATIONS_RESPONSE':
                this.stationsCache = payload.data;
                this.scheduleNextFetch();
                break;
            case 'STATIONS_RESPONSE_ERROR':
                this.scheduleNextFetch();
                break;
            case 'TIME_TABLE_RESPONSE':
                this.trains = payload.data;
                this.error = false;
                this.updateDom();
                this.scheduleNextFetch();
                break;
            case 'TIME_TABLE_RESPONSE_ERROR':
                this.error = true;
                this.updateDom();
                this.scheduleNextFetch();
                break;
        }
    }
});