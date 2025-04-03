// js/components/FooterComponent.js

const FooterComponent = {
  template: `
    <footer class="footer mt-auto py-3 bg-light">
      <div class="container text-center">
        <span class="text-muted">
          &copy; {{ currentYear }} Lithium Recycling Dashboard. All rights reserved.
        </span>
        <!-- Add other footer links or info here if needed -->
      </div>
    </footer>
  `,
  data() {
    return {
      currentYear: new Date().getFullYear()
    };
  },
  mounted() {
    console.log("FooterComponent mounted.");
  }
};

// Make available for import in app.js
export default FooterComponent;