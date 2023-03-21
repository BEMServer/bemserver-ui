Changelog
---------

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
