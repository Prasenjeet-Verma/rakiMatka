//         1 display 1 hide

document.addEventListener("DOMContentLoaded", function () {
  // 1. Select all the image items
  const slides = document.querySelectorAll(".sequential-itemm");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const counter = document.getElementById("counter");

  let currentIndex = 0; // Start at the first image (index 0)

  // Set the initial automatic slide interval
  let autoSlide = setInterval(showNext, 3000);

  /**
   * Updates the visibility of the slides and the counter text.
   */
  function updateSlider() {
    slides.forEach((slide, index) => {
      // Hide all slides
      slide.classList.remove("active");

      // Show only the current slide
      if (index === currentIndex) {
        slide.classList.add("active");
      }
    });

    // Update the counter display
    counter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  /**
   * Resets the interval timer. Called on manual navigation.
   */
  function resetInterval() {
    clearInterval(autoSlide); // Stop the running interval
    autoSlide = setInterval(showNext, 3000); // Start a new interval
  }

  /**
   * Moves to the next slide, cycling back to the start if necessary.
   */
  function showNext() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlider();
  }

  /**
   * Moves to the previous slide, cycling back to the end if necessary.
   */
  function showPrev() {
    // (currentIndex - 1 + slides.length) ensures we handle going from 0 to the last index correctly
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlider();
  }

  // 3. Attach event listeners to buttons
  // FIX: Call showNext/showPrev AND resetInterval to prevent timing conflicts
  nextBtn.addEventListener("click", () => {
    showNext();
    resetInterval();
  });

  prevBtn.addEventListener("click", () => {
    showPrev();
    resetInterval();
  });

  // Initial call to ensure the first slide is visible and counter is correct
  updateSlider();
});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".banner-slide");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const paginationContainer = document.getElementById("pagination");
  let currentSlideIndex = 0;
  const totalSlides = slides.length;
  const transitionDuration = 700; // Must match CSS transition duration (0.7s)

  // --- Utility Functions ---

  // Function to check and update button states (disabled/enabled)
  function updateButtonState(index) {
    // In a looping slider, buttons are always enabled
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  // Function to update pagination dots
  function updatePagination(index) {
    paginationContainer.querySelectorAll(".dot").forEach((dot, i) => {
      dot.classList.remove("bg-indigo-600", "w-3");
      dot.classList.add("bg-gray-400", "w-2");
      if (i === index) {
        dot.classList.add("bg-indigo-600", "w-3");
        dot.classList.remove("bg-gray-400", "w-2");
      }
    });
  }

  // Function to handle the slide change animation
  function goToSlide(newIndex) {
    if (newIndex === currentSlideIndex) return;

    const currentSlide = slides[currentSlideIndex];
    const newSlide = slides[newIndex];

    // Determine direction based on index change for visual consistency
    // 'next' is LTR (incoming from Left, outgoing to Right)
    // 'prev' is RTL (incoming from Right, outgoing to Left)
    const direction =
      newIndex > currentSlideIndex ||
      (newIndex === 0 && currentSlideIndex === totalSlides - 1)
        ? "next"
        : "prev";

    // 1. Clean up potential old state and prepare new slide for its incoming position
    newSlide.classList.remove("outgoing-right", "outgoing-left", "active");
    newSlide.style.opacity = 0; // Ensure it's invisible before transition

    if (direction === "next") {
      // Prepare new slide to start from the left (LTR motion)
      newSlide.style.transform = "translateX(-100%)";
    } else {
      // Prepare new slide to start from the right (RTL motion)
      newSlide.style.transform = "translateX(100%)";
    }

    // 2. Prepare current slide (outgoing)
    currentSlide.classList.remove("active");
    currentSlide.classList.remove("outgoing-right", "outgoing-left");

    if (direction === "next") {
      // Outgoing slide moves RIGHT (uses CSS class .outgoing-right)
      currentSlide.classList.add("outgoing-right");
    } else {
      // Outgoing slide moves LEFT (uses CSS class .outgoing-left)
      currentSlide.classList.add("outgoing-left");
    }

    // 3. Update the index
    const oldSlide = currentSlide;
    currentSlideIndex = newIndex;

    // 4. Trigger the transition for the new slide
    // Use requestAnimationFrame to ensure the browser registers the initial position
    requestAnimationFrame(() => {
      newSlide.classList.add("active");
      // The CSS transition will now move it from -100% (or 100%) to 0
      newSlide.style.transform = "translateX(0)";
      newSlide.style.opacity = 1;

      // Clean up the old slide after transition completes
      setTimeout(() => {
        // Remove temporary classes/styles to let the old slide reset to its default CSS state
        oldSlide.classList.remove("outgoing-right", "outgoing-left");
        oldSlide.style.transform = "";
        oldSlide.style.opacity = "";
      }, transitionDuration);
    });

    updatePagination(currentSlideIndex);
    updateButtonState(currentSlideIndex);
  }

  // --- Event Handlers ---

  function handleNext() {
    const newIndex = (currentSlideIndex + 1) % totalSlides;
    goToSlide(newIndex);
  }

  function handlePrev() {
    const newIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
    goToSlide(newIndex);
  }

  nextBtn.addEventListener("click", handleNext);
  prevBtn.addEventListener("click", handlePrev);

  // --- Initialization ---

  // 1. Generate Pagination Dots and set initial state
  slides.forEach((slide, i) => {
    const dot = document.createElement("span");
    dot.classList.add(
      "dot",
      "h-2",
      "rounded-full",
      "cursor-pointer",
      "transition-all",
      "inline-block",
      "mx-1"
    );

    // FIX: Replaced comma-operator ternary with standard if/else to fix SyntaxError
    if (i === 0) {
      dot.classList.add("bg-indigo-600", "w-3");
    } else {
      dot.classList.add("bg-gray-400", "w-2");
    }

    dot.dataset.index = i;
    dot.addEventListener("click", () => goToSlide(i));
    paginationContainer.appendChild(dot);
  });

  // 2. Start Autoplay
  const autoPlayInterval = 5000; // 5 seconds
  setInterval(handleNext, autoPlayInterval);

  // Set initial state
  updateButtonState(currentSlideIndex);
});
