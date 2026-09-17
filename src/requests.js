const gatewayApiUrl = import.meta.env.VITE_SERVICE_GATEWAY_URL

const JWT = {
    parse: (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }
}

const tryRenewToken = async (request, next) => {

    const bearerToken = localStorage.getItem('authToken')
    const bearerTokenDecodificado = JWT.parse(bearerToken)
    if (bearerToken && new Date(bearerTokenDecodificado.exp * 1000) > new Date()) {
        return next(request);
    }

    try {
        const response = await fetch(gatewayApiUrl + 'auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Falha ao tentar renovar token!`)
        }

        const token = await response.json();
        localStorage.setItem('authToken', JSON.stringify(token))

        return next(request)
    } catch (err) {
        console.debug(err)
        throw new Error('Erro ao tentar renovar token!')
    }
};

const injectToken = async (request, next) => {
    const authToken = JSON.parse(localStorage.getItem('authToken')).accessToken;
    request.headers.set('Authorization', 'Bearer ' + authToken);
    return next(request);
};

function applyMiddleware(originalFetch, middlewares) {
    return function (resource, options = {}) {
        let request = new Request(resource, options);

        let index = 0;

        async function next(req) {
            if (index < middlewares.length) {
                const middleware = middlewares[index++];
                return middleware(req, next);
            }
            return originalFetch(req);
        }

        return next(request);
    };
}

const customFetch = applyMiddleware(window.fetch, [tryRenewToken, injectToken]);

export const getSeguro = (path, onSuccess, onError) => {

    if (!onSuccess || !onError) {
        throw new Error('Parâmetro(s) não informado(s) na chada do getSeguro!')
    }

    customFetch(gatewayApiUrl + path, { method: 'GET' })
        .then(async res => {
            if (!res.ok) {
                let corpoErro = null
                try {
                    corpoErro = await res.json()
                } catch {
                    // corpo de erro pode não ser JSON
                }
                const erro = new Error(`Requisição para "${path}" falhou com status ${res.status}`)
                erro.status = res.status
                erro.body = corpoErro
                throw erro
            }
            return res.json()
        })
        .then(dados => onSuccess(dados))
        .catch(err => onError(err))
}


export const postSeguro = (path, body, onSuccess, onError) => {

    if (!onSuccess || !onError) {
        throw new Error('Parâmetro(s) não informado(s) na chada do postSeguro!')
    }

    customFetch(gatewayApiUrl + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
        .then(async res => {
            if (!res.ok) {
                let corpoErro = null
                try {
                    corpoErro = await res.json()
                } catch {
                    // corpo de erro pode não ser JSON
                }
                const erro = new Error(`Requisição para "${path}" falhou com status ${res.status}`)
                erro.status = res.status
                erro.body = corpoErro
                throw erro
            }
            // resposta pode não ter corpo (ex.: 204 No Content)
            if (res.status === 204) {
                return null
            }
            return res.json()
        })
        .then(dados => onSuccess(dados))
        .catch(err => onError(err))
}

export const postArquivoSeguro = (path, data, onSuccess, onError) => {

    if (!onSuccess || !onError) {
        throw new Error('Parâmetro(s) não informado(s) na chada do postSeguro!')
    }

    customFetch(gatewayApiUrl + path, {
        method: 'POST',
        body: data
    })
        .then(async res => {
            if (!res.ok) {
                let corpoErro = null
                try {
                    corpoErro = await res.json()
                } catch {
                    // corpo de erro pode não ser JSON
                }
                const erro = new Error(`Requisição para "${path}" falhou com status ${res.status}`)
                erro.status = res.status
                erro.body = corpoErro
                throw erro
            }
            // resposta pode não ter corpo (ex.: 204 No Content)
            if (res.status === 204) {
                return null
            }
            return res
        })
        .then(dados => onSuccess(dados))
        .catch(err => onError(err))
}