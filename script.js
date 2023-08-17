"use strict";

// workout elements
const workoutList = document.querySelector(".workout-list");
const workoutItems = document.querySelector(".workout-items");

const deleteAllWorkouts = document.querySelector(".workout-heading .btn");
const deleteWorkoutBtn = document.querySelector(".workout-title span");
const emptyMsgForWorkout = document.querySelector(".emptyMsg");

// form elements
const form = document.querySelector("form");
const inputType = document.querySelector("#workouts-form-type");
const inputDistance = document.querySelector("#distance");
const inputDuration = document.querySelector("#duration");
const inputCadenceElev = document.querySelector("#cadence");
const inputDate = document.querySelector("#date");
const toggleCadence = document.querySelector("#toggleCadence");
const closeFormBtn = document.querySelector(".btn-close");

// errMsg
const errMsg = document.querySelector(".errMsg");
const closeErrBtn = document.querySelector(".errMsg span");

const welcomeMsg = document.querySelector(".welcome-container");

class Workouts {
  id = (Date.now() + "").slice(-10);
  constructor(coords, type, distance, duration, workoutDate) {
    this.workoutLocation = coords;
    this.type = type;
    this.distance = distance;
    this.duration = duration;
    this.workoutDate = workoutDate;
    this.id;
  }
}

class Running extends Workouts {
  constructor(coords, type, distance, duration, workoutDate, cadence) {
    super(coords, type, distance, duration, workoutDate);
    this.gain = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

class Cycling extends Workouts {
  constructor(coords, type, distance, duration, workoutDate, elevGain) {
    super(coords, type, distance, duration, workoutDate);
    this.gain = elevGain;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

class Map {
  #map;
  #workOutLocation;
  #workouts = [];
  markers = [];
  #id;
  #workoutItems;
  constructor() {
    this.getLocation();
    form.addEventListener("submit", this.addOREditWorkout.bind(this));
    inputType.addEventListener("change", this.changeType.bind(this));
    closeErrBtn.addEventListener("click", this.closeErrMsg.bind(this));
    closeFormBtn.addEventListener("click", this.closeForm.bind(this));
    deleteAllWorkouts.addEventListener(
      "click",
      this.deleteAllWorkout.bind(this)
    );
    this.showMsgforEmptyWorkout();
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.loadMap.bind(this),
        function () {
          alert("You denied location sharing");
        }
      );
    }
  }

  loadMap(position) {
    const { latitude, longitude } = position.coords;

    this.#map = L.map("map").setView([latitude, longitude], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker([latitude, longitude])
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 500,
          minwidth: 300,
          autoClose: true,
          closeOnClick: true,
          className: "popup",
        })
      )
      .setPopupContent("😎 your current location")
      .openPopup();

    this.#map.on("click", this.openForm.bind(this));

    // loading workouts created by users
    this.getFromLocalStorage();
    this.#workouts?.forEach((workout) => this.createWorkoutItem(workout));
  }

  openForm(workoutLocation = "") {
    this.#workOutLocation = workoutLocation;
    welcomeMsg.style.display = "none";
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  closeForm(e) {
    e.preventDefault();
    form.classList.add("hidden");
    inputDistance.value = inputDuration.value = inputCadenceElev.value = "";
    this.removeSelected();
  }

  getformInputs() {
    return {
      type: inputType.value,
      distance: inputDistance.value,
      duration: inputDuration.value,
      workoutDate: inputDate.value,
      cadenceElev: inputCadenceElev.value,
    };
  }

  addOREditWorkout(e) {
    e.preventDefault();

    if (!this.isCorrectFormat()) {
      errMsg.classList.remove("opacity");
      return;
    }

    if (this.#workouts.some((workout) => workout.id === this.#id)) {
      this.editWorkout(this.#id);
      this.#id = "";
    } else {
      this.addWorkout();
    }

    this.removeSelected();
  }

  addWorkout() {
    let workout;
    const inputs = this.getformInputs();
    const { lat, lng } = this.#workOutLocation.latlng;

    const workoutAruguments = [
      inputs.type,
      inputs.distance,
      inputs.duration,
      inputs.workoutDate,
      inputs.cadenceElev,
    ];

    workout =
      inputs.type === "cycling"
        ? new Cycling([lat, lng], ...workoutAruguments)
        : new Running([lat, lng], ...workoutAruguments);

    this.#workouts.push(workout);
    this.setToLocalStorage(this.#workouts);
    workoutList.style.display = "flex";
    this.createWorkoutItem(workout);
  }

  isCorrectFormat() {
    const inputs = this.getformInputs();

    const isEmpty = [
      inputs.distance,
      inputs.duration,
      inputs.workoutDate,
      inputs.cadenceElev,
    ].every((value) => value !== "");

    const isNumber = [
      inputs.distance,
      inputs.duration,
      inputs.cadenceElev,
    ].every((value) => value > 0);

    return isEmpty && isNumber;
  }

  editWorkout(id) {
    const inputs = this.getformInputs();

    this.#workouts = this.#workouts.map((workout) =>
      workout.id === id
        ? {
            type: inputs.type,
            distance: inputs.distance,
            duration: inputs.duration,
            workoutDate: inputs.workoutDate,
            id: workout.id,
            gain: inputs.cadenceElev,
            pace: (inputs.duration / inputs.distance).toFixed(1),
            speed: (inputs.distance / (inputs.duration / 60)).toFixed(1),
            workoutLocation: workout.workoutLocation,
          }
        : workout
    );

    this.setAndGetWorkouts();
    this.removeMapMarker();
    this.#workouts.forEach((workout) => this.createWorkoutItem(workout));
    // this.#workoutItem.classList.remove("selected");
  }

  createWorkoutItem(workout) {
    const workoutDate = this.setDate(workout.workoutDate);
    let isCycling = workout.type === "cycling";

    const html = `
      <div class="workout-item ${workout.type}" data-id = ${workout.id}>
        <div class="workout-title ${workout.type}">
          <p>${isCycling ? "🚴 Cycling" : "🏃 Running"} on ${workoutDate}</p>
          <div class="buttons"> 
            <button class = "edit-btn" title="edit 😉">✏️</button>
            <button class = "close-btn" title="delete 😞">❌</button>
          </div>
        </div>
        <ul>
          <li>
            <span>🛣️ ${workout.distance}km</span>
          </li>
          <li>
            <span>⏱️ ${workout.duration}min</span>
          </li>
          <li>
            <span>⚡️ ${isCycling ? workout.speed : workout.pace} Km/h</span>
          </li>
          <li>
            <span> ${
              isCycling
                ? "🚵 " + workout.gain + "m"
                : "🦶 " + workout.gain + "spm"
            }</span>
          </li>
        </ul>
      </div>
      `;

    // adding new workout to html
    workoutItems.insertAdjacentHTML("afterbegin", html);
    this.workoutHelper(workout);
    this.addMarker(workoutDate, workout.workoutLocation, workout.type);
  }

  // Will to Dom selection and manipulation
  workoutHelper(workout) {
    workoutItems.style.display = "flex";
    form.classList.add("hidden");
    inputDistance.value = inputDuration.value = inputCadenceElev.value = "";

    //  selecting delebtn
    document
      .querySelector(".close-btn")
      .addEventListener("click", this.deleteWorkout.bind(this));

    // selecting workout item
    document
      .querySelector(".workout-item")
      .addEventListener(
        "click",
        this.movToMapView.bind(this, workout.workoutLocation)
      );

    //  selecting edit button
    document
      .querySelector(".edit-btn")
      .addEventListener("click", this.reopenForm.bind(this, workout));

    // hidding emptyMsgForWorkout
    emptyMsgForWorkout.style.display = "none";
  }

  reopenForm(workout) {
    this.#id = workout.id;
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    inputDate.value = workout.workoutDate;
    inputCadenceElev.value = workout.gain;
    form.classList.remove("hidden");

    this.#workoutItems = document.querySelectorAll(".workout-item");

    this.#workoutItems.forEach((workout) => {
      if (workout.dataset.id === this.#id) {
        workout.classList.add("selected");
      } else {
        workout.classList.remove("selected");
      }
    });
  }

  addMarker(workoutDate, workoutLocation, type) {
    const marker = L.marker(workoutLocation)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 450,
          minwidth: 300,
          autoClose: false,
          closeOnClick: false,
          className: `popup-${type}`,
        })
      )
      .setPopupContent(
        `${type === "cycling" ? "🚴 Cycling" : "🏃 Running"} on ${workoutDate}`
      )
      .openPopup();

    this.markers.push(marker);
  }

  // Move to workout location
  movToMapView(coords) {
    if (!this.#map) return;
    this.#map.setView(coords, 10, {
      animate: true,
      pan: {
        duration: 1.1,
      },
    });
  }

  // saving workouts to localStorage
  setToLocalStorage(workouts) {
    localStorage.setItem("workouts", JSON.stringify(workouts));
  }

  getFromLocalStorage() {
    this.#workouts = JSON.parse(localStorage.getItem("workouts"));

    if (this.#workouts) {
      workoutList.style.display = "flex";
      welcomeMsg.style.display = "none";
      inputDistance.focus();
      workoutItems.style.display = "flex";
    } else {
      this.#workouts = [];
    }
  }

  // Deleting workouts
  deleteWorkout(e) {
    e.preventDefault();
    const id = e.target.closest(".workout-item").dataset.id;
    this.#workouts = this.#workouts.filter((workout) => workout.id !== id);
    this.setAndGetWorkouts();
    this.removeMapMarker();
    this.#workouts.forEach((workout) => this.createWorkoutItem(workout));
  }

  deleteAllWorkout(e) {
    e.preventDefault();
    this.#workouts = [];
    this.setAndGetWorkouts();
    this.removeMapMarker();
  }

  removeMapMarker() {
    this.markers.forEach((marker) => {
      this.#map.removeLayer(marker);
    });
  }

  // setting and geeting workouts in localStorage
  setAndGetWorkouts() {
    this.setToLocalStorage(this.#workouts);
    this.getFromLocalStorage();
    workoutItems.innerHTML = "";
    this.showMsgforEmptyWorkout();
  }

  // msg for empty workouts
  showMsgforEmptyWorkout() {
    if (this.#workouts.length == 0) {
      emptyMsgForWorkout.style.display = "block";
    }
  }

  // changing cadence to elevation and vice versa
  changeType() {
    if (inputType.value === "running") {
      toggleCadence.textContent = "Cadence";
      inputCadenceElev.placeholder = "step/min";
    }
    if (inputType.value === "cycling") {
      toggleCadence.textContent = "Elev";
      inputCadenceElev.placeholder = "meters";
    }
  }

  // closing form err msg
  closeErrMsg() {
    errMsg.classList.add("opacity");
  }

  // remove selected class from items
  removeSelected() {
    this.#workoutItems?.forEach((workout) => {
      workout.classList.remove("selected");
    });
  }

  // Formating Date
  setDate(workoutDate) {
    const [year, month, date] = workoutDate.split("-");

    const newdate = new Date();
    newdate.setFullYear(year, month - 1, date);
    const options = {
      day: "numeric",
      month: "short",
    };

    return Intl.DateTimeFormat("en-In", options).format(newdate);
  }
}

const Mapty = new Map();
