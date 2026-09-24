import lume from "lume/mod.ts";
import esbuild from "lume/plugins/esbuild.ts";
import jsx from "lume/plugins/jsx.ts";

const site = lume({ src: "./src" });

site.use(jsx());
site.use(esbuild());
site.add("scripts/chart.ts");
site.add("styles.css");
site.add("favicon.svg");
site.add("og");

export default site;
