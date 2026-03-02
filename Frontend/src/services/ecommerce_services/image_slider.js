export function initMemberSlider() {
  class MemberSlider {
    constructor() {
      // Initialize state
      this.currentIndex = 0;
      this.isAutoPlaying = true;
      this.autoPlayInterval = null;

      // Get DOM elements
      this.sliderContainer = document.querySelector(".slider-container");
      if (!this.sliderContainer) {
        console.error("Slider container not found!");
        return;
      }

      this.slides = this.sliderContainer.querySelectorAll(".slide");
      this.dots = this.sliderContainer.querySelectorAll(".dot");
      this.prevBtn = this.sliderContainer.querySelector(".prev-btn");
      this.nextBtn = this.sliderContainer.querySelector(".next-btn");
      this.playPauseBtn = this.sliderContainer.querySelector(".play-pause-btn");
      this.sliderTrack = this.sliderContainer.querySelector(".slider-track");

      this.totalSlides = this.slides.length;
      this.init();
    }

    init() {
      this.attachEventListeners();
      this.startAutoPlay();
    }

    attachEventListeners() {
      this.prevBtn.addEventListener("click", () => this.prevSlide());
      this.nextBtn.addEventListener("click", () => this.nextSlide());
      this.playPauseBtn.addEventListener("click", () => this.toggleAutoPlay());

      this.dots.forEach(dot => {
        dot.addEventListener("click", e => {
          this.currentIndex = parseInt(e.target.dataset.index);
          this.updateSlider();
          this.resetAutoPlay();
        });
      });

      this.sliderTrack.addEventListener("mouseenter", () => {
        if (this.isAutoPlaying) this.stopAutoPlay();
      });

      this.sliderTrack.addEventListener("mouseleave", () => {
        if (this.isAutoPlaying) this.startAutoPlay();
      });
    }

    nextSlide() {
      this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
      this.updateSlider();
      this.resetAutoPlay();
    }

    prevSlide() {
      this.currentIndex =
        (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
      this.updateSlider();
      this.resetAutoPlay();
    }

    updateSlider() {
      this.slides.forEach((slide, i) =>
        slide.classList.toggle("active", i === this.currentIndex)
      );
      this.dots.forEach((dot, i) =>
        dot.classList.toggle("active", i === this.currentIndex)
      );
    }

    startAutoPlay() {
      this.autoPlayInterval = setInterval(() => this.nextSlide(), 3000);
      this.playPauseBtn.querySelector(".play-icon").textContent = "⏸";
    }

    stopAutoPlay() {
      clearInterval(this.autoPlayInterval);
      this.playPauseBtn.querySelector(".play-icon").textContent = "▶";
    }

    toggleAutoPlay() {
      this.isAutoPlaying = !this.isAutoPlaying;
      this.isAutoPlaying ? this.startAutoPlay() : this.stopAutoPlay();
    }

    resetAutoPlay() {
      if (this.isAutoPlaying) {
        this.stopAutoPlay();
        this.startAutoPlay();
      }
    }
  }

  new MemberSlider();
}
