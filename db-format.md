items collection:
item{
\_id

    img{path}

    dates{ created:
            modified:

}

stored: boolean

    location{ pack:
                section:
                warehouse:
    }

    owner

    category

    description

    tags{} //each item can have many and each tag can be edited 

    updates{} // each update have a string and date of creation 

    name

    part_num

    delivered_by

    delivered_to: if(!stored)

}

/////////////////////////////////////////////////

history collection:
transaction{
\_id

item_id:item.\_id

date

from:item.location

to:some location

delivered_to

new_item: boolean
}
