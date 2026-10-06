from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
    #app.run(host='0.0.0.0', port=5000, debug=True) #para movil
    #app.run(host='0.0.0.0', port=5000, ssl_context=('openssl/cert.pem', 'openssl/key.pem'))


