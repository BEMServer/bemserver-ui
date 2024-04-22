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

    static addDays(date, days) {
        let result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static getWeek(date, dowOffset = 0) {
        let firstDay = date.getDay() - dowOffset;
        firstDay = firstDay < 0 ? (firstDay - (6 - dowOffset)) : firstDay * -1;
        let lastDay = firstDay + 6;
        let firstDate = TimeCalendar.addDays(date, firstDay);
        let lastDate = TimeCalendar.addDays(date, lastDay);
        return [firstDate, lastDate];
    }

    // Inspired by https://www.epoch-calendar.com/support/getting_iso_week.html
    static getWeekNumber(date, dowOffset = 0) {
        let newYear = new Date(date.getFullYear(), 0, 1);
        let day = newYear.getDay() - dowOffset; // the day of week the year begins on
        day = day >= 0 ? day : day + 7;
        let daynum = Math.floor((date.getTime() - newYear.getTime() - (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
        let weeknum;
        // if the year starts before the middle of a week
        if (day < 4) {
            weeknum = Math.floor((daynum + day - 1) / 7) + 1;
            if (weeknum > 52) {
                let nYear = new Date(date.getFullYear() + 1, 0, 1);
                let nday = nYear.getDay() - dowOffset;
                nday = nday >= 0 ? nday : nday + 7;
                // if the next year starts before the middle of the week, it is week #1 of that year
                weeknum = nday < 4 ? 1 : 53;
            }
        }
        else {
            weeknum = Math.floor((daynum + day - 1) / 7);
        }
        return weeknum;
    }

    static isWeekInRange(rangeStartDate, rangeEndDate, weekFirstDate, weekLastDate) {
        return (
            (weekFirstDate <= rangeStartDate && weekLastDate >= rangeStartDate && weekLastDate <= rangeEndDate)
            || (weekFirstDate >= rangeStartDate && weekFirstDate < rangeEndDate && weekLastDate >= rangeStartDate && weekLastDate <= rangeEndDate)
            || (weekFirstDate >= rangeStartDate && weekFirstDate < rangeEndDate && weekLastDate >= rangeEndDate)
        );
    }
}
