import { useTranslation } from "react-i18next";
import { Button } from "../components/button";
import { Helmet } from "react-helmet";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";

export function ErrorPage({ error }: { error?: string }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  return (
    <>
      <Helmet>
        <title>{`${t("error.title")} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={t("error.title")} />
        <meta property="og:image" content={siteConfig.avatar} />
      </Helmet>
      <div className="flex w-full flex-row justify-center ani-show">
        <div className="flex wauto flex-col items-center justify-center space-y-2 rounded-2xl bg-w px-3 py-3 sm:p-6">
          <h1 className="text-xl font-bold t-primary">{error}</h1>
          <Button title={t("index.back")} onClick={() => (window.location.href = "/")} />
        </div>
      </div>
    </>
  );
}