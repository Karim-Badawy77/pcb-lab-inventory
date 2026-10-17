# Install project on new system

go to `C:\Program Files\MongoDB\Server\<MongoDB_Version>\bin`

edit **mongod.cfg**

```shell
#replication:
```

to

```shell
replication:
replSetName: "rs0"
```

- cd .../pcb-lab-inventory  
  make .env file

- run install-app.bat

- for everyday use, you can run the following shell command in the project root directory:  
  **run start-app.bat**

- for more instructions on how to manage this project, please refer to the README.md file in the project root directory.

## For database backup and restore:

```shell
  mongodump --db=pcb-lab-inventory --archive=<file_path>.archive --gzip
  mongorestore --db=pcb-lab-inventory --archive=<file_path>.archive --gzip
```
