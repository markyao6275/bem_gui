from flask import Flask, render_template, request

app = Flask(__name__, static_url_path='')

def getSum(a, b):
    return (float(a) + float(b))

@app.route('/')
@app.route('/test/', methods = ['GET'])
def requestReceiver():
    if (request.args.get('input1') == None or request.args.get('input2') == None):
        sum = None
    else:
        sum = getSum(request.args.get('input1'), request.args.get('input2'))
    return render_template('example.html', input = sum)




if __name__ == '__main__':
    app.run(debug = True)