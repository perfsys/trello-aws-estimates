'use strict';
const Trello = require("trello");
const R = require('ramda');

console.log('Initializing Trello ...')

const TRELLO_KEY = process.env.TRELLO_KEY
const TRELLO_TOKEN = process.env.TRELLO_TOKEN
const TRELLO_MEMBER = process.env.TRELLO_MEMBER

const trello = new Trello(TRELLO_KEY, TRELLO_TOKEN);

const runEstimationPerList = async (fields) => {
    try {
        const {id, name} = fields
        const cards = await trello.getCardsForList(id)
        let nameTitle = name

        const nameMatch = name.match(/\(\d{1,2}\/\d{1,2}\)/)
        if (nameMatch){
            nameTitle = name.replace(nameMatch,'')
        }
        nameTitle = nameTitle.trim()

        const mapFields = (o) => {
            let name = R.prop('name', o)
            name = R.trim(name)
            // console.log(`name: ${name}`)
            const words = name.split(' ');
            // TODO need to check if this is (x/x)
            const estimate = words[0]

            if (estimate.match(/\(\d{1,2}\/\d{1,2}\)/)) {
                let estimateValues = estimate.replace('(', '')
                estimateValues = estimateValues.replace(')', '')
                const estimateValuesArray = estimateValues.split('/')

                return {
                    name: name,
                    estimate: estimate,
                    estimateValues: estimateValuesArray,
                    actual: parseInt(estimateValuesArray[0]),
                    planned: parseInt(estimateValuesArray[1])
                }
            } else {
                return {
                    name: name,
                    estimate: null,
                    estimateValues: [],
                    actual: 0,
                    planned: 0
                }
            }

        }
        const cardsMapped = R.map(mapFields, cards)

        const actualValuesArray = R.map((o) => R.prop('actual', o), cardsMapped)
        const plannedValuesArray = R.map((o) => R.prop('planned', o), cardsMapped)


        return {
            ...fields,
            nameTitle,
            sum: {
                actual: R.sum(actualValuesArray),
                planned: R.sum(plannedValuesArray)
            }
        }

    } catch (e) {
        console.error(e)
        return e
    }

}

const runEstimationPerBoard = async (fields) =>{
    try {

        const {id} =fields
        const boardLists = await trello.getListsOnBoard(id)

        const boardListsFields = R.map((o) => {
            return {
                id: R.prop('id', o),
                name: R.prop('name', o)
            }
        }, boardLists)


        const results = await Promise.all(R.map(runEstimationPerList, boardListsFields))

        return {
            ...fields,
            results
        }

    } catch (e) {
        console.error(e)
        return e
    }
}



module.exports.runEstimates = async (event, context) => {
    try {

        const boards = await trello.getBoards(TRELLO_MEMBER)
        const boardFields = R.map((o) => {
            return {
                id: R.prop('id', o),
                url: R.prop('url', o),
                name: R.prop('name', o)
            }
        }, boards)

        const result = await Promise.all(R.map(runEstimationPerBoard, boardFields))


        return {
            event: event,
            context: context,
            result: result
        }
    } catch (e) {
        console.error(e)
        return e
    }

};
