export class TimeDisplay {
    static toLocaleString(datetime, {locale = navigator.language, timezone = "UTC"}) {
        return datetime.toLocaleString(locale, {timeZone: timezone, timeZoneName: "longOffset"})
    }

    static getMonthName(monthNumber, locale = navigator.language) {
        let date = new Date(1970);
        date.setMonth(monthNumber - 1);
        return date.toLocaleString(locale, { month: "long" });
    }
}


export class TimeCalendar {
    static isLeapYear(year) {
        return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
    }

    static getDaysInYear(year) {
        return TimeCalendar.isLeapYear(year) ? 366 : 365;
    }

    static getDaysInMonth(year, month) {
        if (month == 2) {
            return TimeCalendar.isLeapYear(year) ? 29 : 28;
        }
        else if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        }
        return 31;
    }
}
