require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require('dayjs');
const locale_ko = require('dayjs/locale/ko');

const url = process.env.API_HOST;

const clubList = [];
const bookingDate = '2022-10-28';
const bookingTime = [11, 13];

let result = [];

dayjs.locale('ko');

const urlEncoder = (name) => {
    let dayOfWeek = dayjs(bookingDate).format("MM/DD (ddd)")

    let params = {
        page: 1,
        promotionType: '',
        roundDay1: bookingDate,
        roundDay2: '',
        roundDay3: '',
        selectedRoundDay1: bookingDate,
        selectedRoundDay2: '',
        selectedRoundDay3: '',
        parentAreaCode: 0,
        areaCode: 0,
        displayOrder: 'golfClubName',
        calendarValue : dayOfWeek,
        date1: dayOfWeek,
        date2: '',
        date3: '',
        areaselect: '',
        area: 'on',
        area1: 'on',
        area2: 'on',
        area4: 'on',
        area5: 'on',
        area6: 'on',
        area7: 'on',
        golfClubName: name,
    }

    params = new URLSearchParams(params).toString();

    return `${url}?${params}`
} 

const getHtmlAll = async() => {
    let endpoints = [];
     
    clubList.forEach(club => endpoints.push(urlEncoder(club)));

    try { 
        return await axios.all(endpoints.map((endpoint) => axios.get(endpoint)));
    } catch (error) {
        console.error(error);
    }
}


const getReserveTime = () =>{

    console.log(`${ dayjs().format('YYYY-MM-DD hh:mm')} 실행`)

    getHtmlAll()
    .then((response) => {

        response.forEach(html => {
            const $ = cheerio.load(html.data);
            const list = {
                name : $('.teetime_box .info_box .name').text(),
                time : []
            }

            const $timeList = $('.gaessamzieFlickItem .select dd');

            if ($timeList.length > 0) {
                $timeList.each(function(i, el) {
                    let time = $(this).find('.time').text().replace(/\n|\r|\s*/g, "");

                    let h = time.split(':');

                    if(h[0] >= bookingTime[0] && h[0] <= bookingTime[1]) {
                        list.time.push(time)
                    }

                   
                });

                if (list.time[0]) {
                    result.push(list)
                }
               
            }

        })

        console.log(result[0]);
        
        if (result[0]) {
            sendWebhook(result)
        }
       

})
}


const sendWebhook = (datas) => {
    const webhookUri = process.env.WEBHOOK_HOST;

    const options = {
        channel: "#골프장예약",
        username: "Alert Bot", 
        icon_emoji: ":technologist:", 
        text:`*${ dayjs().format('YYYY-MM-DD hh:mm')} 현재 예약 가능한 골프장* \n ${bookingDate} ${bookingTime[0]}:00 ~ ${bookingTime[1]}:00 :arrow_down: \n ` // 내용
    }

    console.log(datas)

    datas.forEach(club => {
        options.text += `:technologist: *[${club.name}]*  \n ${ club.time.join(' / ')} \n `; 
    });
    
    // request 발송
    axios.post(webhookUri, options)
    .then((response) => {
        console.info(`Message posted successfully: ${response}`);
        result = []
    })
    .catch((error) => {
        console.error(`Error posting message to Slack API: ${error}`);
        result = []
    });


}

getReserveTime()
setInterval(()=>{getReserveTime()}, 60000);

const express = require('express')
const app = express()
const PORT = 8001
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')
app.get('/', (req, res) => {
  res.render('index')
})
app.listen(PORT, () => {
    console.log(`server started on PORT ${PORT}`)
})
