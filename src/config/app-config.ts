import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Vecta",
  version: packageJson.version,
  copyright: `© ${currentYear}, Vecta.`,
  meta: {
    title: "Vecta - Sistema de Proyecciones y Costos",
    description:
      "Vecta es un sistema de proyecciones y costos que te ayuda a tomar mejores decisiones basadas en datos.",
  },
};
