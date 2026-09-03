import type { ReactNode } from "react";
import { lazy, Suspense, useContext } from "react";
import type { DefaultParams, PathPattern } from "wouter";
import { Route, Switch } from "wouter";
import Footer from "../components/footer";
import { Header } from "../components/header";
import { Padding } from "../components/padding";
import { Spinner } from "@rin/ui";
import { getHeaderLayoutDefinition } from "../components/site-header/layout-registry";
import { Tips, TipsPage } from "../components/tips";
import useTableOfContents from "../hooks/useTableOfContents";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { CallbackPage } from "../page/callback";
import { ErrorPage } from "../page/error";
import { FeedPage, TOCHeader } from "../page/feed";
import { FeedsPage } from "../page/feeds";
import { ProfileContext } from "../state/profile";
import { tryInt } from "../utils/int";
import { useTranslation } from "react-i18next";

// Route-level code splitting: only the most-frequented visitor pages (feeds /
// feed detail) are bundled into the entry chunk. Everything else — especially
// admin-only pages that pull in Monaco, charts, etc. — is loaded on demand.
function lazyNamed<K extends string, M extends Record<K, React.ComponentType<any>>>(
    loader: () => Promise<M>,
    name: K,
): React.LazyExoticComponent<M[K]> {
    return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const TimelinePage = lazyNamed(() => import("../page/timeline"), "TimelinePage");
const MomentsPage = lazyNamed(() => import("../page/moments"), "MomentsPage");
const FriendsPage = lazyNamed(() => import("../page/friends"), "FriendsPage");
const HashtagsPage = lazyNamed(() => import("../page/hashtags"), "HashtagsPage");
const HashtagPage = lazyNamed(() => import("../page/hashtag"), "HashtagPage");
const EntitiesPage = lazyNamed(() => import("../page/entities"), "EntitiesPage");
const EntityPage = lazyNamed(() => import("../page/entity"), "EntityPage");
const SearchPage = lazyNamed(() => import("../page/search"), "SearchPage");
const LoginPage = lazyNamed(() => import("../page/login"), "LoginPage");
const ProfilePage = lazyNamed(() => import("../page/profile"), "ProfilePage");
const Settings = lazyNamed(() => import("../page/settings"), "Settings");
const CommentsModerationPage = lazyNamed(() => import("../page/comments-moderation"), "CommentsModerationPage");
const HealthPage = lazyNamed(() => import("../page/health"), "HealthPage");
const QueueStatusPage = lazyNamed(() => import("../page/queue-status"), "QueueStatusPage");
const CompatTasksPage = lazyNamed(() => import("../page/compat-tasks"), "CompatTasksPage");
const WritingPage = lazyNamed(() => import("../page/writing"), "WritingPage");
const AdminLayout = lazyNamed(() => import("../components/admin-layout"), "AdminLayout");

function PageLoading() {
    return (
        <div className="w-full h-96 flex flex-col justify-center items-center text-theme ani-show-fast">
            <Spinner size="2em" />
        </div>
    );
}

export function AppRoutes() {
  const { t } = useTranslation();

  return (
    <Switch>
      <AppRoute path="/">
        <FeedsPage />
      </AppRoute>

      <AppRoute path="/timeline">
        <TimelinePage />
      </AppRoute>

      <AppRoute path="/moments">
        <MomentsPage />
      </AppRoute>

      <AppRoute path="/friends">
        <FriendsPage />
      </AppRoute>

      <AppRoute path="/hashtags">
        <HashtagsPage />
      </AppRoute>

      <AppRoute path="/hashtag/:name">
        {(params) => <HashtagPage name={params.name || ""} />}
      </AppRoute>

      <AppRoute path="/entities">
        <EntitiesPage />
      </AppRoute>

      <AppRoute path="/entity/:slug">
        {(params) => <EntityPage slug={params.slug || ""} />}
      </AppRoute>

      <AppRoute path="/search/:keyword">
        {(params) => <SearchPage keyword={params.keyword || ""} />}
      </AppRoute>

      <AdminRoute path="/admin/settings" requirePermission title={t("settings.title")} description={t("admin.settings_description")}>
        <Settings />
      </AdminRoute>

      <AdminRoute path="/admin/comments" requirePermission title={t("comment_moderation.title")} description={t("admin.comments_description")}      >
        <CommentsModerationPage />
      </AdminRoute>

      <AdminRoute path="/admin/health" requirePermission title={t("health.title")} description={t("admin.health_description")}>
        <HealthPage />
      </AdminRoute>

      <AdminRoute path="/admin/queue-status" requirePermission title={t("queue_status.title")} description={t("admin.queue_status_description")}>
        <QueueStatusPage />
      </AdminRoute>

      <AdminRoute path="/admin/compat-tasks" requirePermission title={t("compat_tasks.title")} description={t("admin.compat_tasks_description")}>
        <CompatTasksPage />
      </AdminRoute>

      <AdminRoute path="/admin/writing" requirePermission title={t("writing")} description={t("admin.writing_description")}>
        <WritingPage />
      </AdminRoute>

      <AdminRoute path="/admin/writing/:id" requirePermission title={t("writing")} description={t("admin.writing_description")}>
        {({ id }) => <WritingPage id={tryInt(0, id)} />}
      </AdminRoute>

      <AppRoute path="/callback">
        <CallbackPage />
      </AppRoute>

      <AppRoute path="/login">
        <LoginPage />
      </AppRoute>

      <AppRoute path="/profile">
        <ProfilePage />
      </AppRoute>

      <TocRoute path="/feed/:id">
        {(params, toc, cleanup) => <FeedPage id={params.id || ""} TOC={toc} clean={cleanup} />}
      </TocRoute>

      <TocRoute path="/:alias">
        {(params, toc, cleanup) => <FeedPage id={params.alias || ""} TOC={toc} clean={cleanup} />}
      </TocRoute>

      <AppRoute path="/user/github">
        <TipsPage>
          <Tips value={t("error.api_url")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute path="/*/user/github">
        <TipsPage>
          <Tips value={t("error.api_url_slash")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute path="/user/github/callback">
        <TipsPage>
          <Tips value={t("error.github_callback")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute>
        <ErrorPage error={t("error.not_found")} />
      </AppRoute>
    </Switch>
  );
}

function AppRoute({
  path,
  children,
  headerComponent,
  paddingClassName,
  requirePermission,
}: {
  path?: PathPattern;
  children: ReactNode | ((params: DefaultParams) => ReactNode);
  headerComponent?: ReactNode;
  paddingClassName?: string;
  requirePermission?: boolean;
}) {
  const profile = useContext(ProfileContext);
  const siteConfig = useSiteConfig();
  const { t } = useTranslation();

  const content =
    requirePermission && !profile?.permission ? <ErrorPage error={t("error.permission_denied")} /> : children;

  return (
    <Route path={path}>
      {(params) => {
        const resolvedContent = typeof content === "function" ? content(params) : content;
        const layoutDefinition = getHeaderLayoutDefinition(siteConfig.headerLayout);

        return layoutDefinition.renderRouteShell({
          header: <Header>{headerComponent}</Header>,
          content: (
            <Padding className={paddingClassName}>
              <Suspense fallback={<PageLoading />}>{resolvedContent}</Suspense>
            </Padding>
          ),
          footer: <Footer />,
          paddingClassName,
        });
      }}
    </Route>
  );
}

function AdminRoute({
  path,
  children,
  requirePermission,
  title,
  description,
}: {
  path: PathPattern;
  children: ReactNode | ((params: DefaultParams) => ReactNode);
  requirePermission?: boolean;
  title: string;
  description: string;
}) {
  const profile = useContext(ProfileContext);
  const { t } = useTranslation();
  const content =
    requirePermission && !profile?.permission ? <ErrorPage error={t("error.permission_denied")} /> : children;

  return (
    <Route path={path}>
      {(params) => (
        <Suspense fallback={<PageLoading />}>
          <AdminLayout title={title} description={description}>
            {typeof content === "function" ? content(params) : content}
          </AdminLayout>
        </Suspense>
      )}
    </Route>
  );
}

function TocRoute({
  path,
  children,
}: {
  path: PathPattern;
  children: (params: DefaultParams, toc: () => JSX.Element, cleanup: (id: string) => void) => ReactNode;
}) {
  const { TOC, cleanup } = useTableOfContents(".toc-content");

  return (
    <AppRoute path={path} headerComponent={TOCHeader({ TOC })}>
      {(params) => children(params, TOC, cleanup)}
    </AppRoute>
  );
}
