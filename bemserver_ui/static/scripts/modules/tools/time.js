class TimeDisplay {
    static toLocaleString(datetime, locale = navigator.language, timezone = "UTC") {
        return datetime.toLocaleString(locale, {timeZone: timezone, timeZoneName: "short"})
    }
}


export { TimeDisplay } ;
