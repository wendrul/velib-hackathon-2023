"use strict";

let map = L.map('map').setView([48.86, 2.34], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


let animation_meta = {
  date: 1,
  time: 1,
}

function setup_widgets() {
  let date_slider = document.getElementById('date_slider');
  bulmaSlider.attach(date_slider);
  date_slider.setAttribute('min', Date.parse('2023-02-03T00:00:00'));
  date_slider.setAttribute('value', date_slider.getAttribute('min'));
  date_slider.setAttribute('max', Date.parse('2023-02-03T23:59:59'));
  date_slider.setAttribute('step', 100000);
  date_slider.dispatchEvent(new Event('input'));
  date_slider.addEventListener('input', (e) => {
    animation_meta.time = e.target.value;
    renderFrame();
  });
}

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
    const station_circle = L.circle([station.lat, station.lon], {
      color: '#eb349c',
      fillColor: '#eb349c',
      fillOpacity: 0.2,
      radius: lerp(0, 200, station.capacity / 200),
      // stroke: false

    }).addTo(map);

    station_circle['stationCode'] = station.stationCode;
    station_circle['station'] = station;
    station_circle.setTooltipContent(`<strong>${station.name}</strong> #${station.stationCode}<br>capacity: ${station.capacity} bikes`);
    station_circle.setPopupContent(`<strong>${station.name}</strong> #${station.stationCode}<br>capacity: ${station.capacity} bikes`);
    current_circles.push(station_circle);
  }
}

let last_meta = null;
const radiusModifier = 3;

function renderFrame() {
  console.log(animation_meta);
  if (last_meta && last_meta.time == animation_meta.time) {
    return;
  }
  
  last_meta = {...animation_meta};
  let total_bikes = 0;
  for (const circle of current_circles) {
    let circle_data = remplissage_data[circle.stationCode];
    if (circle_data == undefined) {
      // console.warn(`Didn't find station ${circle.stationCode}`);
      map.removeLayer(circle);
      continue;
    }

    let latest_update = circle_data[0];

    for (const row of circle_data) {
      if (row.date > animation_meta.time) {
        break;
      }
      latest_update = row;
    }
    const bikeCount = latest_update["VAE disponibles"] +
      latest_update["VAE disponibles (Station +)"] +
      latest_update["VM disponibles"] +
      latest_update["VM disponibles (Station +)"];

    total_bikes += bikeCount;
    const station = circle.station;

    circle.setRadius(bikeCount * radiusModifier);
    circle.bindTooltip(`<strong>${station.name}</strong> #${station.stationCode}<br>capacity: ${bikeCount}/${station.capacity}`);
    circle.bindPopup(`<strong>${station.name}</strong> #${station.stationCode}<br>capacity: ${bikeCount}/${station.capacity}`);
    if (bikeCount == station.capacity) {
      circle.setStyle({color: "red"})
    }
    else {
      circle.setStyle({color: "#eb349c"})
    }
  }
  document.getElementById('total_bikes').innerText = total_bikes;
  document.getElementById('date_text').innerText = new Date(parseInt(animation_meta.time)).toLocaleTimeString();
}

let remplissage_data = null;

async function main() {
  setup_widgets();
  stations = await (await fetch('./station_information.json')).json();
  stations = stations.data.stations;
  console.log(stations);

  remplissage_data = Papa.parse(
    await (await fetch('./02_Historique_remplissage_stations/2023_02/2023-02-03_Historique_remplissage_stations.csv'))
      .text(), { header: true, dynamicTyping: true });

  let stations_status = {}
  for (const row of remplissage_data.data) {
    if (stations_status[row["Code station"]] == undefined) {
      stations_status[row["Code station"]] = []
    }

    row['date'] = Date.parse(row["Date mise à jour"]);
    stations_status[row["Code station"]].push(row);
  }
  console.log(remplissage_data);
  remplissage_data = stations_status;

  show_stations();
  renderFrame();
}

let animation_should_run = false;

function stopAnimation() {
  animation_should_run = false;
  document.getElementById('date_slider').disabled = false;
}

function startAnimation() {
  if (animation_should_run == true) return;
  animation_should_run = true;
  document.getElementById('date_slider').disabled = true;
  runAnimation();
}

function runAnimation() {
  if (!animation_should_run) {
    return;
  }
  
  const slider = document.getElementById('date_slider')
  let animation_timer = parseInt(slider.getAttribute('value'));
  animation_timer +=  parseInt(slider.getAttribute('step'));

  if (animation_timer > parseInt(slider.getAttribute('max'))) {
    console.log("stopping");
    stopAnimation();
    return;
  } 

  slider.setAttribute('value', animation_timer);
  date_slider.dispatchEvent(new Event('input'));

  setTimeout(runAnimation, 10);
}

main()
