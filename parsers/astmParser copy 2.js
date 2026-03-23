const parseASTM = (rawData) => {
    const lines = rawData.split('\n').map(line => line.trim()).filter(line => line);
    const resultJson = {
        header: {},
        patients: []
    };

    let currentPatient = null;
    let currentOrder = null;

    lines.forEach(line => {
        const fields = line.split('|');
        const type = fields[0]; // H, P, O, R, C, L

        switch (type) {
            case 'H':
                resultJson.header = {
                    sender: fields[4],
                    timestamp: fields[13]
                };
                break;

            case 'P':
                currentPatient = {
                    id: fields[2],
                    name: fields[5]?.replace(/\^/g, ' '), // Name format handle karna
                    gender: fields[8],
                    orders: []
                };
                resultJson.patients.push(currentPatient);
                break;

            case 'O':
                if (currentPatient) {
                    currentOrder = {
                        sampleId: fields[2],
                        testNames: fields[4]?.split('\\').map(t => t.replace(/\^/g, '').trim()), // Multi-test handle karna
                        timestamp: fields[6],
                        results: [],
                        comments: []
                    };
                    currentPatient.orders.push(currentOrder);
                }
                break;

            case 'R':
                if (currentOrder) {
                    currentOrder.results.push({
                        testName: fields[2]?.replace(/\^/g, '').trim(),
                        value: fields[3],
                        units: fields[4],
                        range: fields[5],
                        flag: fields[6], // H, L, N, LL, HH
                        status: fields[8],
                        timestamp: fields[12]
                    });
                }
                break;

            case 'C':
                if (currentOrder) {
                    currentOrder.comments.push(fields[3]);
                }
                break;
        }
    });

    return resultJson;
};