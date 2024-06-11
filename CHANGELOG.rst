Changelog
---------

0.7.0 (2024-06-11)
++++++++++++++++++

Features:

- Authentication:

  - Use bearer token authentication mode (huge page load speed improvement)

- Timeseries data:

  - Rework completeness analysis (period selection, chart auto height size...)

- Campaigns:

  - Change the campaign selection mode from the campaign list page (click on campaign item)

Fixes:

- Fix deegre days analysis (month order of x-axis in compare mode)
- Fix inappropriate validation error when site latitude/longitude is empty
- Fix events edit page (campaign context was wrong)
- Fix timeseries edit page (problem on attributes tab selection)
- Fix structural elements (sites, buildings...) edit and explore pages (problem on attributes tab selection)

Other changes:

- Change license to MIT
- Require bemserver-api-client >=0.21.1 and <0.22.0
- Require bemserver-api 0.24.0
- Require bemserver-core 0.18.0

0.6.2 (2024-02-15)
++++++++++++++++++

Features:

- Add profiling feature

Other changes:

- Require bemserver-api-client >=0.20.3 and <0.21.0
- Require bemserver-api 0.23.0
- Require bemserver-core 0.17.1

0.6.1 (2023-07-06)
++++++++++++++++++

Features:

- General:

  - Change sites/zones tree view icons

Fixes:

- Fix notifications table display

Other changes:

- Still require bemserver-api-client >=0.20.1 and <0.21.0
- Still require bemserver-api 0.21.0
- Still require bemserver-core 0.16.0

0.6.0 (2023-07-04)
++++++++++++++++++

Features:

- General:

  - Rework to improve global UX (start page, remove campaign selector, rename some elements...)

- Sites:

  - Create page: show full path of parent locations

- Timeseries:

  - Improve chart in timeseries data explore page
  - Improve search filter in timeseries list and set locations pages

- Analysis:

  - Improve degree days chart and add a note about calculation method
  - Improve weather analysis page

Fixes:

- Fix building/storey/space/zone edition (400 error)
- Fix timeseries data explore page (when timeseries has no data)
- Fix manage cleanup service page

Other changes:

- Require bemserver-api-client >=0.20.1 and <0.21.0
- Still require bemserver-api 0.21.0
- Still require bemserver-core 0.16.0

0.5.3 (2023-06-16)
++++++++++++++++++

Features:

- Timeseries:

  - Rework timeseries data explore page

- Analysis:

  - Add weather data analysis page

- User menu:

  - Add settings entry (with notifications settings)

Fixes:

- Fix weather data service management page (forecast)

Other changes:

- Require bemserver-api-client >=0.20.0 and <0.21.0
- Require bemserver-api 0.21.0
- Require bemserver-core 0.16.0

0.5.2 (2023-05-25)
++++++++++++++++++

Features:

- Timeseries:

  - Add weather forecast timeseries semantics setup

- Services:

  - Add weather forecast data service management page

Fixes:

- Fix site latitude/longitude coordinates inputs
- Fix timeseris data explore page (unselected timeseries remained in the chart)
- Fix sites tree load in degree days analysis page

Other changes:

- Require bemserver-api-client >=0.19.1 and <0.20.0
- Require bemserver-api 0.20.1
- Require bemserver-core 0.15.1

0.5.1 (2023-04-27)
++++++++++++++++++

Features:

- General:

  - Add (optional) latitude/longitude coordinates on sites

- Timeseries:

  - Add data stats tab in timeseries list page

- Analysis:

  - Add site degree days analysis page

- Services:

  - Add weather data service management page

Fixes:

- Fix internal server error on cleanup service page

Other changes:

- Require bemserver-api-client >=0.18.0 and <0.19.0
- Require bemserver-api 0.18.2
- Require bemserver-core 0.13.4

0.5.0 (2023-03-30)
++++++++++++++++++

Features:

- Timeseries:

  - Improve timeseries list page (locations are loaded faster)

Other changes:

- Require bemserver-api-client >=0.16.0 and <0.17.0
- Require bemserver-api 0.16.0
- Still require bemserver-core 0.12.0
- Rename campaign context query args for consistency with ``campaign_ctxt``:

  - ``forced_campaign`` into ``forced_campaign_ctxt``
  - ``ignore_campaign`` into ``ignore_campaign_ctxt``

- Add tests on some internal core features
- Rework plugins extension (provide campaign context to a ``get_sidebar`` function inside UI plugins)

0.4.2 (2023-03-21)
++++++++++++++++++

Features:

- Timeseries:

  - Improve timeseries selector component (function to set filters after init)
  - Add timeseries semantics setup page

- Analysis:

  - Remove energy consumption analysis setup page (feature is now covered by timeseries semantics)

Fixes:

- Improve edit (link/unlink timeseries or locations) events feedback messages

Other changes:

- Support Python 3.11
- Require bemserver-api-client >=0.15.0 and <0.16.0
- Require bemserver-api 0.15.0
- Require bemserver-core 0.12.0
- Rename app config vars:

  - ``FLASK_SETTINGS_FILE`` into ``BEMSERVER_UI_SETTINGS_FILE``
  - ``BEMSERVER_TIMEZONE_NAME`` into ``BEMSERVER_UI_TIMEZONE_NAME``
  - ``BEMSERVER_NOTIFICATION_UPDATER_DELAY`` into ``BEMSERVER_UI_NOTIFICATION_UPDATER_DELAY``
  - ``BEMSERVER_PARTNERS_FILE`` into ``BEMSERVER_UI_PARTNERS_FILE``
  - ``BEMSERVER_PLUGINS`` into ``BEMSERVER_UI_PLUGINS``

- Add deployment docs

0.4.1 (2023-03-02)
++++++++++++++++++

Features:

- Analysis:

  - Update energy consumption analysis setup page (remove "wh factor" field)

Fixes:

- Improve 409 status code management (in displayed messages)
- Improve campaign scope creation mechanics (redirections when created or cancelled...)

Other changes:

- Require bemserver-api-client >=0.12.1 and <0.13.0
- Require bemserver-api 0.12.1
- Require bemserver-core 0.10.1

0.4.0 (2023-02-28)
++++++++++++++++++

Features:

- General:

  - Move campaign scopes entry point (from sidebar to campaigns list page)
  - Add plugin system (see `UI plugin example repository <https://github.com/BEMServer/bemserver-ui-plugin-example>`_)

Fixes:

- Fix locations picker in events edit page
- Improve campaign context management (query arg name...)

0.3.0 (2023-02-17)
++++++++++++++++++

Features:

- General:

  - Remove messages container max height limit (all message stack is entirely visible, without scrollbar)
  - Rework timeseries selector (use location selector as filter)

- Notifications:

  - Animate notifications header icon when unread notifications are received
  - Add notifications page: view all notifications (read/unread) for each campaign
  - Move access to notifications setup page from events to notifications module

- Timeseries data explore:

  - Introduce a second Y-axis (on the right of the chart)
  - Add customization options for timeseries (left/right Y-axis, line/bar, color of data series)
  - Display timeseries data unit symbol

- Events:

  - Added editing of events' related timeseries and structural elements (sites, buildings...)

Fixes:

- Improve datetime picker component (filter mode style)
- Fix navigation buttons state inside modal of events page

Other changes:

- Require bemserver-api-client >=0.11.1 and <0.12.0
- Require bemserver-api 0.11.1
- Require bemserver-core 0.9.1

0.2.1 (2023-01-30)
++++++++++++++++++

Features:

- Add check outlier data service management pages
- Rework sites/buildings... filtering on timeseries and events pages (selection via a tree view)
- Improve timeseries data explore page:

  - Add *count* aggregation mode
  - Hide *duration* selection when *no aggregation* mode is selected

Fixes:

- Repair campaign create/edit page (bug with timezones and datetimes picker)
- Improve notifications setup page

Other changes:

- Require bemserver-api-client >=0.10.0 and <0.11.0
- Require bemserver-api >=0.10.0 and <0.11.0
- Require bemserver-core >=0.8.0 and <0.9.0

0.2.0 (2023-01-23)
++++++++++++++++++

Features:

- Add events management pages
- Update cleanup service status page (sort buttons)
- Improve drag & drop feature
- Add drag & drop to manage groups for campaign scopes
- Add check missing data service management pages
- Add event notifications setup page
- Update sites/buildings... explore page:

  - Update timeseries tab (recursive option)
  - Add events tab (with recursive option)

- Notifications check (update header bell status)

Fixes:

- Improve tabs style (when disabled)
- Limit timeseries selection to 1 element in energy consumption analysis setup page

Other changes:

- Require bemserver-api-client >=0.9.0 and <0.10.0
- Require bemserver-api >=0.9.0 and <0.10.0
- Require bemserver-core >=0.7.0 and <0.8.0

0.1.2 (2022-11-30)
++++++++++++++++++

Features:

- Update completeness chart (add units)

Other changes:

- Require bemserver-api-client >=0.2.0 and <0.3.0
- Require bemserver-api >=0.2.0 and <0.3.0
- Require bemserver-core >=0.2.0 and <0.3.0

0.1.1 (2022-11-30)
++++++++++++++++++

Features:

- Update sites/buildings... explore (paginated list in timeseries tab)

Fixes:

- Repair timeseries data explore download CSV chart toolbox feature
- Minor other fixes

Other changes:

- Require bemserver-api-client >=0.2.0 and <0.3.0
- Require bemserver-api >=0.2.0 and <0.3.0
- Require bemserver-core >=0.2.0 and <0.3.0

0.1.0 (2022-11-22)
++++++++++++++++++

Features:

- Sign in/out
- Manage users and user groups
- Manage campaigns
- Manage campaign scopes
- Manage sites/buildings/storeys/spaces and zones
- Manage timeseries
- Manage timeseries data (upload, delete, basic explore, completeness)
- Analysis for energy consumption timeseries data
- Manage cleanup service (timeseries data from "raw" state to "clean")
- Manage sites/buildings... properties (area...)
- Manage timeseries properties (min/max value...)

Other changes:

- Require bemserver-api-client >=0.1.0 and <0.2.0
- Require bemserver-api >=0.1.0 and <0.2.0
- Require bemserver-core >=0.1.0 and <0.2.0
