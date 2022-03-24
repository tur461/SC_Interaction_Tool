let _web3 = null,
    ABI = null;
    contractAddress = '',
    accs=[], 
    contract = null, 
    connected = false
    methods = [],
    defaultGasLimit = '670000',
    autoScrollTime = 3250, // 3.25 s
    targetId = '';
let _ip_values = [];
let _ip_names = [];
let _ip_types = [];
let _meth_name = '';
let nahiJaneDo = false;

let contractAddr = '0x0AE675C5917c1dab986A17a145D6D5dA00a8bD3f';
let address = '0x47e18C4d1e23027FEd38D9a1CCA82E11a7D42cab';

function reset_params() {
    _ip_values = [];
    _ip_names = [];
    _ip_types = [];
    _meth_name = '';
}

        let ddown = $('#ddown');

        let acc = {
            ME: '0xF19250A3320bE69B80daf65D057aE05Bb12F0919',
            SS: '0xB6e3974F93B9e5790Ae0a3f4Aea00c83bdD26bfc',

        };


        $('#connect').on('click', start);
        $('#storage-value').on('click', getStorageValue);
        $('#abiFile').on('change', loadAbiFromFile);
        ddown.on('change', prepMethodParams);
        ddown.on('click', ddownClicked);

        function ddownClicked() {
            if(!connected) {
                _s('please connect first!', 'e');
                return;
            }
            ddown.off('click', ddownClicked);
        }

        function autoScroll(w) {
            window.location.hash = '#all-status-container';
            if(w === 'e')
                setTimeout(_ => window.location.hash = targetId, autoScrollTime);
        }

        function post(op) {
            $(op.id1).attr('class', '');
            $(op.id1).addClass('status-' + op.w);
            $(op.id2).text(op.msg);
        }

        function _s(s, w) {
            post({
                id1:'#status-div',
                id2: '#status',
                w: w,
                msg: s,
            });
            autoScroll(w);
        }

        function _r(r, w) {
            post({
                id1:'#result-div',
                id2: '#result',
                w: w,
                msg: r,
            });
            autoScroll(w);
        }

        function prepMethods() {
            methods = ABI.filter(a => a.type === 'function')
                .map(b => {
                    return {
                        inputs: b.inputs.map(ip => { return {name: ip.name, type: ip.type}}),
                        name: b.name,
                        mutable: b.stateMutability === 'view' ? !1 : !0,
                        payable: b.stateMutability === 'payable' ? !0 : !1,
                    }
                })
        }

        function fillMethods() {
            methods.forEach((m, i) => 
                ddown.append($("<option></option>")
                    .attr("value", i)
                    .attr('class', 'dd-item')
                    .text(
                        `${m.name} (${
                            (m.payable ? ' (payable)': 'non-payable')
                            + ', ' +
                            (m.mutable ? ' mutable': 'view')
                        })`
                    )
                )
            );
        }

        function prepMethodParams(e) {
            reset_params();
            let i = +$(this).val();
            if(i < 0) return;
            let meth = methods[i], 
                genIps = $('#gen-ips'), 
                btn = $('#callorsend'),
                inp = null;
            
            genIps.html('');
            _meth_name = meth.name;
            meth.inputs.forEach(ip => {
                _ip_names.push(ip.name);
                _ip_types.push(ip.type);
                inp = $('<input>')
                        .attr('id', ip.name)
                        .attr('name', ip.name)
                        .attr('class', 'form-control ips')
                        .attr('placeholder', 'type ' + ip.type + ' here...');
                lbl = $('<label></label>').text(ip.name)
                genIps.append(lbl);
                genIps.append(inp);
            })

            btn.off('click', send);
            btn.off('click', call);

            // incomplete functionality
            if(meth.payable) {
                // add input for send value
                genIps.append($('<label></label>').text('Payment Amount (value)'));
                genIps.append(
                    $('<input>')
                    .attr('id', 'payment')
                    .attr('name', 'payment')
                    .attr('placeholder', 'enter eth value here...')
                    .attr('class', 'form-control ips')
                );
            }

            if(meth.mutable) {
                genIps.append($('<label></label>').text('Gas'));
                genIps.append(
                    $('<input>')
                    .attr('id', 'gaslimit')
                    .attr('name', 'gaslimit')
                    .attr('placeholder', 'enter amount of gas here...')
                    .attr('class', 'form-control ips')
                );
                btn.on('click', send);
                // btn.text('Send');
            } else {
                btn.on('click', call);
                // btn.text('Call');
            }

            btn.data('index', i);
            btn.removeClass('d-none');
        }

        function call() {
            targetId = '##contract-meth-container';
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                p = [],
                err = {
                    level: 0,
                    ids: [],
                    put: function(id) { ++this.level; this.ids.push(id); }
                };
            console.log('call:', meth);
            ips.each((_, ip) => !$(ip).val() ? err.put(ip.id) : p.push($(ip).val()))

            if(err.level > 0) {
                console.log(`you have ${err.level} errors:`, err);
                _s('Please fill-in all the input parameters', 'e');
                return;
            }
            
            _s('calling, please wait...');
            _ip_values = p;
            try {
                contract
                .methods[meth.name](...p)
                .call()
                .then(res => {
                    console.log('call success:', res);
                    if(typeof res == 'object') res = 'success';
                    _r(res, 's');
                })
                .catch(e => {
                    console.log('call Error:', e);
                    _r('Call resulted into an error!!!. (please open console for details)', 'e');
                })
                .finally(_ => _s('Call Completed.', 'n'));
            } catch (e) {
                console.log('call error:', e);
                _s('Call resulted in an Error, please try again (ensure correct input parameters as well)!!', 'e')
            }
        }

        function send(e) {
            targetId = '##contract-meth-container';
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                p = [],
                err = {
                    level: 0,
                    ids: [],
                    put: function(id) { ++this.level; this.ids.push(id); }
                };
            
            ips.each((_, ip) => !$(ip).val() ? err.put(ip.id) : p.push($(ip).val()));
            
            if(err.ids.includes('gaslimit')) {
                --err.level;
                err.ids.splice(err.ids.indexOf('gaslimit'), 1);
                p.push(defaultGasLimit);
            }

            if(err.level > 0) {
                console.log(`you have ${err.level} errors:`, err);
                _s('Please fill-in all the input parameters', 'e');
                return;
            }

            let f = meth.payable,
                params = p.slice(0, p.length - (f?2:1)), 
                gasLimit = p[p.length - 1],
                sendOpts = { from: accs[0], gas: gasLimit };
            
            if(f) sendOpts['value'] = p[p.length - 2];
            
            console.log('sending with params:', params, 'and send options:', sendOpts); 
            
            _s('Calling, please wait...', 'n');
            _ip_values = params;
            try {
                contract
                .methods[meth.name](...params)
                .send(sendOpts)
                .then(res => {
                    console.log('call success:', res);
                    if(typeof res == 'object') res = 'success';
                    _r(res, 's');
                })
                .catch(e => {
                    console.log('call Error:', e);
                    _r('Call resulted into an error!!!. (please open console for details)', 'e');
                })
                .finally(_ => _s('Call Completed.', 'n'));
            } catch (e) {
                console.log('call error:', e);
                _s('Call resulted in an Error, please try again (ensure correct input parameters as well)!!.', 'e')
            }
        }

        function getContractAddress() {
            contractAddress = $('#caddress').val();
        }

        function parseABI(txt) {
            let abi = null;
            try {
                abi = JSON.parse(txt);
            } catch (e) {
                let m = 'ABI is not in valid format!';
                _s(m, 'e');
                console.log(m + ':', e);
            }
            return abi;
        }

        function loadAbiFromTextArea() {
            let abiTxt = $('#abi').val();
            if(abiTxt) {
                ABI = parseABI(abiTxt);
                if(!ABI) throw "ABI error";
            }
        }

        function loadAbiFromFile(ev) {
            targetId = '#contract-prep-container';
            let frdr = new FileReader();
            frdr.onload = e => ABI = parseABI(e.target.result);
            frdr.readAsText(ev.target.files[0]);
        }

        function start() {
            targetId = '#contract-prep-container';
            getContractAddress();
            loadAbiFromTextArea();
                
                if(!contractAddress) {
                    console.log('please provide contract address');
                    _s('No contract address provided!', 'e')
                    return;
                }
                
                if(!ABI) {
                    console.log('No ABI provided');
                    _s('No ABI provided!', 'e');
                    return;
                }


            if (typeof window.ethereum !== 'undefined') {
              console.log('MetaMask is installed!');
              ethereum.enable();
              connect();
              prepMethods();
              fillMethods();
            } else {
                console.log('connecting to external wallet');
                _web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
            }  
        }

        function connect_wallet() {
            if (typeof window.ethereum !== 'undefined') {
                console.log('MetaMask is installed!');
                ethereum.enable();
                return !0;
            }
            console.log('no metamask found!');
            return !1;
        }

        async function connect() {
            console.log('connecting....');
            _web3 = new Web3(window.ethereum);
            accs = await ethereum.request({ method: 'eth_accounts' });
            console.log('Accounts:', accs, contractAddress);
            _web3.eth.defaultAccount = accs[0];
            
            // initialize contract object with ABI and Address
            contract = new _web3.eth.Contract(ABI, contractAddress);
            // contract.once('Transfer', {
            //       filter: {user: accs[0]},
            //       fromBlock: "latest"
            //     }, function(err, ev){
            //       if (err) console.log(err)
            //       else {
            //         ev = _web3.utils.hexToUtf8(ev.returnValues.flipResult);
            //         console.log('Event:', ev);
            //       }
            //     }
            // ); 

            _s('Connected', 's');
            connected = true;
        }

        
        function getStorageValue() {
            _web3 = _web3 || new Web3(window.ethereum);
            let index = $('#storage-value-ip').val();
            let address = $('#c-address').val() || contractAddress;
            if(!index) {
                _s('provide index', 'e');
                return;
            }
            _web3.eth.getStorageAt(address, +index)
                .then(res => {
                    console.log('Success:', res, convert(res))
                    _r(`raw: ${res}, text: ${convert(res)}`, 's');
                })
                .catch(e => {
                    console.log('error:', e);
                    _r('Error getting storage value', 'e');
                })
                .finally(_ => _s('getting storage value completed.', 'n'));     
        }

        function getipvals() {
            _ip_values = [];
            $('.ips').each((_, ip) => {
                $(ip).attr('name') !== 'gaslimit' &&
                _ip_values.push($(ip).val())
            })
        }

        let Address = {
            owner: '0x84fF670281055e51FE317c0A153AAc2D26619798',
            saleToken: '0x6DF6a2D4ce73Fc937625Db2E5fb5762F248B30F3',
            stableCoin: '0x83D685Ed8D7E2591c998bF2c87e01c5795Df55fd',
            beneficiary: '0x84fF670281055e51FE317c0A153AAc2D26619798',
            stakingContract: '0x018b32b3cfaA0D74953B50309f82e57B4bAEdaE2',
        }
        let AddressT = {
            'Address': {
                'owner': 'address',
                'saleToken': 'address',
                'stableCoin': 'address',
                'beneficiary': 'address',
                'stakingContract': 'address',
            }
        }

        let Timing = {
            pubStart: `${new Date().getTime()}`,
            pvtStart: `${new Date().getTime()}`,
            pubDuration: `${new Date().getTime()}`,
            pvtDuration: `${new Date().getTime()}`,
        }
        let TimingT = {
            'Timing': {
                'pubStart': 'uint256',
                'pvtStart': 'uint256',
                'pubDuration': 'uint256',
                'pvtDuration': 'uint256',
            }
        }
        let Limit = {
            pvtN: '5',
            pubN: '0',
            hardcap: '235000',
            softcap: '0',
            totalSupply: '10000',
            maxAllocationShare: '240',
            profitPercentage: '300',
        }

        let LimitT = {
            'Limit': {
                'pvtN': 'uint256',
                'pubN': 'uint256',
                'hardcap': 'uint256',
                'softcap': 'uint256',
                'totalSupply': 'uint256',
                'maxAllocationShare': 'uint256',
                'profitPercentage': 'uint16',
            }
        }

        $('#create-pool').on('click', createPool);

        function createPool(e) {
            e.preventDefault();
            e.stopPropagation();
            // connect_wallet()
            // connect(true);
            getContractAddress();
            console.log('1');
            _web3 = _web3 || new Web3(window.ethereum);
            console.log('2', _web3.eth.abi);
            let adminC = contractAddress;
            let f = 'createPool((address,address,address,address,address),(uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256,uint16),bool,bool)';
            let sig = _web3.eth.abi.encodeFunctionSignature(f);
            let p1 = [AddressT, TimingT, LimitT, 'bool', 'bool'];
            let p2 = [Address, Timing, Limit, 'false', 'true'];
            console.log('3', p1, p2);
            let params = _web3.eth.abi.encodeParameters(p1, p2).substring(2);
            console.log('4');
            let data_bin = sig + params;
            
            console.log(data_bin);
            let txObj = {
                to: adminC,
                from: accs[0],
                data: data_bin,
                //gas:  '',
            }
            //let ct = new _web3.eth.Contract(ABI, '0x2969ff4c56D5f33A8Bf36F20150f82B2a2a1F52C');
            console.log('transaction is being processed..');

            // _web3.eth.estimateGas({
            //     to: adminC,
            //     from: accs[0],
            //     data: data_bin,
            // })
            // .then(gas => {
            //     console.log('estimating gas:', gas);
            //     txObj['gas'] = gas.toString();
                _web3.eth.sendTransaction(txObj, function(err, dat) {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    console.log('success:', dat);
                });
            // })
            // .catch(err => console.log('estimategas error:', err));

            
            
        }

        function setEstimationGs() {
            getContractAddress();
            getipvals();
        
            _web3 = _web3 || new Web3(window.ethereum);
            var func = `${_meth_name}(${_ip_types.join(',')})`; // "stake(address,uint256,bool,bool)"
            
            var methodSignature = _web3.eth.abi.encodeFunctionSignature(func);
            // console.log('ip', _ip_values, _ip_types, _ip_names);
            // console.log('web3', _web3);
            // console.log('accs[0]',accs[0], 'contract', contractAddress);
            let dd = _ip_types.map((t, i) => {
                return _web3.eth.abi.encodeParameter(t, _ip_values[i]);
            });

            var data = methodSignature //method signature
                + dd.map(d => d.substring(2)).join('');

            estimateGas(_web3, accs[0], contractAddress, data, (err, estimatedGas) => {
                if(err) {
                    console.log(err);
                    $('#estimated-gas-val').html('error: open console');
                    return;
                }
                console.log("estimatedGas: " + estimatedGas);
                $('#estimated-gas-val').html(estimatedGas);
            });
        }

        function estimateGas(web3, acc, contractAddr, data, cb) {
            // console.log(acc, contractAddr, data)
            web3.eth.estimateGas({
                from: acc, 
                data: data,
                to: contractAddr
            }, cb);
          }

        $('#estimate_gas_btn').on('click', e => {
            setEstimationGs();
        })