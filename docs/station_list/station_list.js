"use strict";

let map = L.map('map').setView([48.86, 2.34], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let current_circles = [];
let stations = null;

function clear_circles(params) {
    current_circles.forEach(element => {
        map.removeLayer(element)
    });

    current_circles = [];
}

function lerp(a, b, alpha) {
    return a + alpha * (b - a);
}


function show_heatmap() {
    clear_circles();

    for (const station of stations) {
        let station_circle = L.circle([station.lat, station.lon], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.004 * station.capacity,
            radius: 500,
            stroke: false

        }).addTo(map);

        current_circles.push(station_circle);
    }
}

function show_stations() {
    clear_circles();
    for (const station of stations) {
        let station_circle = L.circle([station.lat, station.lon], {
            color: '#eb349c',
            fillColor: '#eb349c',
            fillOpacity: 0.2,
            radius: lerp(5, 100, station.capacity / 100),
            // stroke: false

        }).addTo(map);

        station_circle.bindTooltip(`<strong>${station.name}</strong> #${station.station_id}<br>capacity: ${station.capacity} bikes`);
        station_circle.bindPopup(`<strong>${station.name}</strong> #${station.station_id}<br>capacity: ${station.capacity} bikes`);
        current_circles.push(station_circle);
    }
}

async function main() {
    stations = await (await fetch('./station_information.json')).json();
    stations = stations.data.stations;
    show_stations()
    console.log(stations);
}

main()