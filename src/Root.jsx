import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
} from "react-router-dom";
import MIRROR_URLS from "./config/mirrors";
import Mirrors from "./Mirrors";
import ISO from "./ISO";
import Site from "./Site";
import About from "./About";

const PROTO_REGEX = /(^https?:)?\/\//;

// eslint-disable-next-line react/display-name
export default React.memo(() => {
  const [mirrors, setMirrors] = useState(new Map());
  const [isoinfo, setIsoinfo] = useState(new Map());
  const [site, setSite] = useState(new Map());

  const mirrorsList = useMemo(() => Array.from(mirrors.values()).flat(), [mirrors]);
  const isoinfoList = useMemo(() => Array.from(isoinfo.values()).flat(), [isoinfo]);
  const siteList = useMemo(() => Array.from(site.values()).flat(), [site]);

  // Load all mirror configurations
  useEffect(() => {
    async function initMirror(url) {
      const resp = await fetch(url);
      const { site, info, mirrors } = await resp.json();

      const parsed = mirrors.map(
        ({ cname, url, help, size, desc, upstream, status }) => {
          const fullUrl = url.match(PROTO_REGEX) ? url : site.url + url;
          const helpUrl =
            help === ""
              ? null
              : help.match(PROTO_REGEX)
              ? help
              : site.url + help;
          return {
            cname,
            full: fullUrl,
            help: helpUrl,
            upstream,
            desc,
            status,
            size,
            source: site.abbr,
            note: site.note,
          };
        }
      );
      setMirrors((original) => new Map(original.set(url, parsed)));

      setSite((original) => new Map(original.set(url, [{ site, parsed }])));

      const fullinfo = info.map(({ category, distro, urls }) => {
        const fullUrls = urls.map(({ name, url }) => {
          return {
            name: name + " [" + site.abbr + "]",
            url: url.match(PROTO_REGEX) ? url : site.url + url,
          };
        });
        return {
          category,
          distro,
          urls: fullUrls,
        };
      });
      setIsoinfo((original) => new Map(original.set(url, fullinfo)));
    }

    // Fires
    for (const mirror of MIRROR_URLS) initMirror(mirror);

    const interval = setInterval(() => {
      console.log("Page", document.visibilityState);
      if (document.visibilityState === "visible") {
        console.log("Refresh data");
        for (const mirror of MIRROR_URLS) initMirror(mirror);
      }
    }, 30*1000);

    return () => clearInterval(interval);
  }, []);

  const location = window.location;
  const history = window.history;
  if (location.hash !== "") {
    const hash = location.hash.slice(1);
    history.replaceState(null, "", `${hash}`);
  }

  return (
    <Router>
      <div id="app-container">
        <div className="sidebar">
          <NavLink 
            to="/"
            activeClassName="active"
            isActive={(_, location) => {
              if (
                location.pathname === "/" ||
                (!location.pathname.startsWith("/list") &&
                !location.pathname.startsWith("/site") &&
                !location.pathname.startsWith("/about"))
              ) {
                return true;
              }
              return false;
            }}
          >
            <img src="static/img/mirrorz.svg" className="sidebar-logo"/>
          </NavLink>
          <NavLink to="/list" activeClassName="active">
            <h2>List</h2>
          </NavLink>
          <NavLink to="/site" activeClassName="active">
            <h2>Site</h2>
          </NavLink>
          <NavLink to="/about" activeClassName="active">
            <h2>About</h2>
          </NavLink>
        </div>
        <main>
          <Switch>
            <Route path="/list">
              <Mirrors mirrors={mirrorsList} />
            </Route>
            <Route path="/site">
              <Site site={siteList} />
            </Route>
            <Route path="/about">
              <About site={siteList} />
            </Route>
            <Route path="*">
              <ISO isoinfo={isoinfoList} />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
});
