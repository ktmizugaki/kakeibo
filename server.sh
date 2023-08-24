#!/bin/bash

[ $UID = 0 ] && USER=nginx && RUN_AS="su $USER -s"
PID=tmp/app.pid
: ${PLAC_ENV:=development}

OPTIONS=
OPTIONS="$OPTIONS -s FCGI -E ${PLAC_ENV}"
OPTIONS="$OPTIONS --access-log log/access.log"
OPTIONS="$OPTIONS -l tmp/app.socket"
OPTIONS="$OPTIONS --pid $PID -D"

DBFILE=kakeibo.db

die() {
    echo "$*" >&2
    exit 1;
}

cd `dirname $0` || die "can't cd to app dir"

mkusrdir() {
    local dir=$1
    if [ -f $dir ]; then
        die "cannot create $dir"
    fi
    mkdir -p $dir || die "cannot create $dir"
    chown -R $USER:$USER $dir || die "cannot change owner of $dir to $USER"
}

status() {
    local pid
    pid=$([ -r $PID ] && cat $PID 2>/dev/null)
    if [ -n "$pid" ]; then
        if kill -0 $pid; then
            return 0
        else
            return 1
        fi
    else
        return 3
    fi
}

do_start() {
    mkusrdir tmp
    mkusrdir log

    if ! [ -f $DBFILE ]; then
        ./dbsetup.pl || die "failed to setup database"
    fi
    chown $USER:$USER $DBFILE || die "cannot change owner of $dbfile to $USER"
    touch $DBFILE-journal
    chown $USER:$USER $DBFILE-journal || die "cannot change owner of $dbfile-jounral to $USER"
    echo "Starting server"
    exec $RUN_AS /bin/bash -c 'eval $(perl -Mlocal::lib=perl5);
exec plackup '"$OPTIONS"' >>log/plackup.stdout.log 2>>log/plackup.stderr.log'
}

case "$1" in
    "start")
        status && echo "Already running" && exit 0
        rc=$?
        if [ $rc == 1 ]; then
            rm $PID
        fi
        do_start;
        ;;
    "stop")
        status
        rc=$?
        if [ $rc == 0 ]; then
            echo "Stopping server"
            kill -TERM $(cat $PID)
            for i in {1..10}; do
                status || break
                sleep 0.2
            done
        elif [ $rc == 1 ]; then
            echo "Server is dead"
            rm $PID
        else
            echo "Server is not running"
        fi
        exit 0
        ;;
    "restart")
        $0 stop
        $0 start
        ;;
    "status")
        status
        rc=$?
        if [ $rc == 0 ]; then
            echo "Server is running"
        elif [ $rc == 1 ]; then
            echo "Server is dead but pid file exists"
        else
            echo "Server is not running"
        fi
        ;;
    *)
        die "Usage: $0 [start|stop|restart|status]"
        ;;
esac
