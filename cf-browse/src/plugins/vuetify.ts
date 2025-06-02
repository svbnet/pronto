/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import { VTreeview } from "vuetify/labs/VTreeview";
import { createVuetify } from "vuetify";
import { VFileUpload } from "vuetify/labs/VFileUpload";

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VTreeview,
    VFileUpload,
  },
  theme: {
    defaultTheme: "dark",
  },
});
